/**
 * PrismLightPuzzleInScene
 * Puzzle de prisma de luz que funciona direto na cena (sem modal/overlay)
 * O jogador arrasta prismas do inventário para os slots e depois rotaciona/espelha
 */
class PrismLightPuzzleInScene {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.container = null;
        this.rayGraphics = null;
        this.emitter = null;
        this.receptor = null;
        this.prisms = [];
        this.solved = false;
        this.active = true;
    }

    create() {
        if (this.config.solved || (this.config.id && gameStateManager?.isPuzzleSolved(this.config.id))) {
            this.solved = true;
            console.log('[PrismInScene] Puzzle já resolvido');
            return;
        }

        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(200);

        this.rayGraphics = this.scene.add.graphics();
        this.rayGraphics.setDepth(190);

        this.createEmitter(bgX, bgY, bgWidth, bgHeight);
        this.createReceptor(bgX, bgY, bgWidth, bgHeight);
        this.createPrismSlots(bgX, bgY, bgWidth, bgHeight);
        this.updateRay(bgX, bgY, bgWidth, bgHeight);
        this.showInstructions();

        console.log('[PrismInScene] Puzzle criado com', this.prisms.length, 'slots de prisma');
    }

    showInstructions() {
        const text = this.scene.add.text(
            this.scene.cameras.main.width / 2, 30,
            '💡 Arraste prismas do inventário para os slots | Clique: Rotacionar | Botão Direito: Espelhar',
            { fontSize: '14px', fontFamily: 'Arial', color: '#00ffff', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 15, y: 8 } }
        );
        text.setOrigin(0.5).setScrollFactor(0).setDepth(250);
        this.instructionText = text;

        this.scene.time.delayedCall(8000, () => {
            if (this.instructionText) {
                this.scene.tweens.add({
                    targets: this.instructionText, alpha: 0, duration: 500,
                    onComplete: () => { this.instructionText?.destroy(); this.instructionText = null; }
                });
            }
        });
    }

    createEmitter(bgX, bgY, bgWidth, bgHeight) {
        const emitterConfig = this.config.emitter || { x: -300, y: 0, direction: 0, color: 0x00ff00 };
        const centerX = bgX + bgWidth / 2;
        const centerY = bgY + bgHeight / 2;
        const x = centerX + emitterConfig.x;
        const y = centerY + emitterConfig.y;

        const emitterCircle = this.scene.add.circle(x, y, 18, emitterConfig.color);
        emitterCircle.setStrokeStyle(3, 0xffffff).setDepth(200);

        const arrowLength = 30;
        const dirRad = emitterConfig.direction * Math.PI / 180;
        const arrowGraphics = this.scene.add.graphics();
        arrowGraphics.lineStyle(4, emitterConfig.color);
        arrowGraphics.lineBetween(x, y, x + Math.cos(dirRad) * arrowLength, y + Math.sin(dirRad) * arrowLength);
        arrowGraphics.setDepth(201);

        this.emitter = { x, y, direction: emitterConfig.direction, color: emitterConfig.color, circle: emitterCircle, arrow: arrowGraphics };
        this.container.add(emitterCircle);
    }

    createReceptor(bgX, bgY, bgWidth, bgHeight) {
        const receptorConfig = this.config.receptor || { x: 300, y: 0, width: 50, height: 50 };
        const centerX = bgX + bgWidth / 2;
        const centerY = bgY + bgHeight / 2;
        const x = centerX + receptorConfig.x;
        const y = centerY + receptorConfig.y;
        const width = receptorConfig.width || 50;
        const height = receptorConfig.height || 50;

        const receptorRect = this.scene.add.rectangle(x, y, width, height, 0xffff00, 0.3);
        receptorRect.setStrokeStyle(4, 0xffff00).setDepth(200);

        const targetGraphics = this.scene.add.graphics();
        targetGraphics.lineStyle(2, 0xffff00);
        targetGraphics.strokeCircle(x, y, 15);
        targetGraphics.strokeCircle(x, y, 8);
        targetGraphics.lineBetween(x - 20, y, x + 20, y);
        targetGraphics.lineBetween(x, y - 20, x, y + 20);
        targetGraphics.setDepth(201);

        this.receptor = { x, y, width, height, rect: receptorRect, target: targetGraphics };
        this.container.add(receptorRect);
    }

    createPrismSlots(bgX, bgY, bgWidth, bgHeight) {
        const slots = this.config.prismSlots || [];
        const centerX = bgX + bgWidth / 2;
        const centerY = bgY + bgHeight / 2;

        slots.forEach((slotConfig, index) => {
            const x = centerX + slotConfig.x;
            const y = centerY + slotConfig.y;
            const slotId = slotConfig.id || `prism_slot_${index}`;
            const savedState = this.getSavedSlotState(slotId);

            const slot = {
                id: slotId, x, y,
                requiredItem: slotConfig.requiredItem,
                filled: savedState !== null,
                rotation: savedState?.rotation || 0,
                flipX: savedState?.flipX || false,
                graphics: null, hitArea: null, lockIcon: null, slotCircle: null, itemLabel: null, index
            };

            if (slot.filled) {
                this.drawPrism(slot);
                this.makePrismInteractive(slot, index);
            } else {
                this.drawEmptySlot(slot);
            }

            this.prisms.push(slot);
        });
    }

    drawEmptySlot(slot) {
        const slotCircle = this.scene.add.circle(slot.x, slot.y, 40, 0x444444, 0.3);
        slotCircle.setStrokeStyle(3, 0x00ffff).setDepth(199);
        slot.slotCircle = slotCircle;

        const lockIcon = this.scene.add.text(slot.x, slot.y, '🔒', { fontSize: '28px' }).setOrigin(0.5).setDepth(200);
        slot.lockIcon = lockIcon;

        const itemLabel = this.scene.add.text(slot.x, slot.y + 45, slot.requiredItem || 'prisma', {
            fontSize: '11px', fontFamily: 'Arial', color: '#aaaaaa', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setDepth(200);
        slot.itemLabel = itemLabel;
    }

    drawPrism(slot) {
        if (slot.graphics) slot.graphics.destroy();

        const graphics = this.scene.add.graphics();
        const size = 35;

        let vertices = [
            { x: -size, y: size },
            { x: -size, y: -size },
            { x: size, y: size }
        ];

        if (slot.flipX) vertices = vertices.map(v => ({ x: -v.x, y: v.y }));

        const angle = slot.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const transformedVertices = vertices.map(v => ({
            x: slot.x + (v.x * cos - v.y * sin),
            y: slot.y + (v.x * sin + v.y * cos)
        }));

        graphics.fillStyle(0x88ccff, 0.6);
        graphics.beginPath();
        graphics.moveTo(transformedVertices[0].x, transformedVertices[0].y);
        for (let i = 1; i < transformedVertices.length; i++) {
            graphics.lineTo(transformedVertices[i].x, transformedVertices[i].y);
        }
        graphics.closePath();
        graphics.fillPath();

        graphics.lineStyle(4, 0x00ffff, 1);
        graphics.beginPath();
        graphics.moveTo(transformedVertices[0].x, transformedVertices[0].y);
        for (let i = 1; i < transformedVertices.length; i++) {
            graphics.lineTo(transformedVertices[i].x, transformedVertices[i].y);
        }
        graphics.closePath();
        graphics.strokePath();

        graphics.fillStyle(0xff6600, 1);
        graphics.fillCircle(transformedVertices[0].x, transformedVertices[0].y, 6);

        graphics.setDepth(205);
        slot.graphics = graphics;
        slot.transformedVertices = transformedVertices;
    }

    makePrismInteractive(slot, index) {
        const hitArea = this.scene.add.circle(slot.x, slot.y, 45, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true }).setDepth(210);

        hitArea.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.flipPrism(slot, index);
            } else {
                this.rotatePrism(slot, index);
            }
        });

        this.scene.input.mouse.disableContextMenu();
        slot.hitArea = hitArea;
    }

    onDropFromInventory(itemId, worldX, worldY) {
        console.log('[PrismInScene] onDropFromInventory:', { itemId, worldX, worldY });

        const itemIdLower = itemId.toLowerCase();

        for (let slot of this.prisms) {
            if (slot.filled) continue;

            const distance = Phaser.Math.Distance.Between(worldX, worldY, slot.x, slot.y);
            console.log('[PrismInScene] Distância para slot', slot.id, ':', distance);

            if (distance < 80) {
                const isCorrectItem = itemIdLower.includes('prisma');
                console.log('[PrismInScene] Item correto?', isCorrectItem);

                if (isCorrectItem) {
                    this.fillSlot(slot, itemId);
                    return true;
                } else {
                    if (window.uiManager?.showNotification) {
                        uiManager.showNotification('Este slot precisa de um prisma');
                    }
                    return true;
                }
            }
        }

        return false;
    }

    fillSlot(slot, itemId) {
        console.log('[PrismInScene] Preenchendo slot', slot.id, 'com item', itemId);

        // PRIMEIRO: Remover item do inventário usando método oficial
        // gameStateManager pode não estar em window, verificar com typeof
        if (typeof gameStateManager !== 'undefined' && gameStateManager) {
            console.log('[PrismInScene] Consumindo item:', itemId);

            // Usar o método consumeItem que já existe no GameStateManager
            gameStateManager.consumeItem(itemId);

            // Também adicionar a consumedItems para redundância
            if (!gameStateManager.state.consumedItems) gameStateManager.state.consumedItems = [];
            if (!gameStateManager.state.consumedItems.includes(itemId)) {
                gameStateManager.state.consumedItems.push(itemId);
            }

            // Salvar imediatamente
            gameStateManager.saveProgress(false);
            console.log('[PrismInScene] Item consumido e progresso salvo');

            // Forçar atualização da UI
            if (typeof uiManager !== 'undefined' && uiManager && uiManager.renderInventory) {
                uiManager.renderInventory();
            }
        } else {
            console.log('[PrismInScene] ERRO: gameStateManager não disponível!');
        }

        slot.filled = true;

        // Remover ícones do slot vazio
        if (slot.lockIcon) { slot.lockIcon.destroy(); slot.lockIcon = null; }
        if (slot.slotCircle) { slot.slotCircle.destroy(); slot.slotCircle = null; }
        if (slot.itemLabel) { slot.itemLabel.destroy(); slot.itemLabel = null; }

        // Desenhar o prisma
        this.drawPrism(slot);
        this.makePrismInteractive(slot, slot.index);

        // Salvar estado do slot
        this.saveSlotState(slot);
        if (window.gameStateManager) gameStateManager.saveProgress();

        // Atualizar raio
        try {
            const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
            this.updateRay(bgX, bgY, bgWidth, bgHeight);
        } catch (e) { }

        if (window.uiManager?.showNotification) {
            uiManager.showNotification('✨ Prisma encaixado! Clique para rotacionar.');
        }
    }

    saveSlotState(slot) {
        if (typeof gameStateManager === 'undefined' || !gameStateManager) return;

        if (!gameStateManager.state.prismPuzzleSlots) gameStateManager.state.prismPuzzleSlots = {};

        const puzzleId = this.config.id || 'prism_puzzle';
        if (!gameStateManager.state.prismPuzzleSlots[puzzleId]) {
            gameStateManager.state.prismPuzzleSlots[puzzleId] = {};
        }

        gameStateManager.state.prismPuzzleSlots[puzzleId][slot.id] = {
            filled: slot.filled, rotation: slot.rotation, flipX: slot.flipX
        };

        console.log('[PrismInScene] Estado do slot salvo:', puzzleId, slot.id);
    }

    getSavedSlotState(slotId) {
        if (typeof gameStateManager === 'undefined' || !gameStateManager) return null;
        const puzzleId = this.config.id || 'prism_puzzle';
        const state = gameStateManager.state.prismPuzzleSlots?.[puzzleId]?.[slotId] || null;
        console.log('[PrismInScene] Estado salvo para', slotId, ':', state);
        return state;
    }

    rotatePrism(slot, index) {
        if (this.solved || !slot.filled) return;

        // Girar 90°
        slot.rotation = (slot.rotation + 90) % 360;

        // Quando completa uma volta (voltou a 0°), fazer flip
        // Assim o jogador pode acessar todas as 8 posições possíveis com cliques simples
        if (slot.rotation === 0) {
            slot.flipX = !slot.flipX;
        }

        this.drawPrism(slot);
        this.saveSlotState(slot);
        if (typeof gameStateManager !== 'undefined' && gameStateManager) {
            gameStateManager.saveProgress(false);
        }

        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
        this.updateRay(bgX, bgY, bgWidth, bgHeight);
    }

    flipPrism(slot, index) {
        if (this.solved || !slot.filled) return;

        slot.flipX = !slot.flipX;
        this.drawPrism(slot);
        this.saveSlotState(slot);
        if (typeof gameStateManager !== 'undefined' && gameStateManager) {
            gameStateManager.saveProgress(false);
        }

        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
        this.updateRay(bgX, bgY, bgWidth, bgHeight);
    }

    updateRay(bgX, bgY, bgWidth, bgHeight) {
        if (!this.rayGraphics) return;

        this.rayGraphics.clear();

        let currentX = this.emitter.x;
        let currentY = this.emitter.y;
        let currentDir = this.emitter.direction;
        const maxBounces = 20;
        let reachedReceptor = false;

        this.rayGraphics.lineStyle(5, this.emitter.color, 1);
        this.rayGraphics.beginPath();
        this.rayGraphics.moveTo(currentX, currentY);

        for (let bounce = 0; bounce < maxBounces; bounce++) {
            const rayLength = 2000;
            const dirRad = currentDir * Math.PI / 180;
            const nextX = currentX + Math.cos(dirRad) * rayLength;
            const nextY = currentY + Math.sin(dirRad) * rayLength;

            let closestHit = null;
            let closestDist = Infinity;

            this.prisms.forEach(slot => {
                if (!slot.filled || !slot.transformedVertices) return;

                const hit = this.rayPrismIntersection(currentX, currentY, nextX, nextY, slot);
                if (hit && hit.distance < closestDist && hit.distance > 2) {
                    closestHit = hit;
                    closestDist = hit.distance;
                }
            });

            const recHit = this.rayRectIntersection(
                currentX, currentY, nextX, nextY,
                this.receptor.x - this.receptor.width / 2,
                this.receptor.y - this.receptor.height / 2,
                this.receptor.width, this.receptor.height
            );

            if (recHit && recHit.distance < closestDist) {
                this.rayGraphics.lineTo(recHit.x, recHit.y);
                reachedReceptor = true;
                break;
            }

            if (closestHit) {
                this.rayGraphics.lineTo(closestHit.point.x, closestHit.point.y);
                currentX = closestHit.point.x;
                currentY = closestHit.point.y;
                currentDir = closestHit.newDirection;
            } else {
                const edgeX = Math.max(0, Math.min(this.scene.cameras.main.width, nextX));
                const edgeY = Math.max(0, Math.min(this.scene.cameras.main.height, nextY));
                this.rayGraphics.lineTo(edgeX, edgeY);
                break;
            }
        }

        this.rayGraphics.strokePath();

        if (reachedReceptor && !this.solved) {
            this.onSolved();
        }
    }

    rayPrismIntersection(rayStartX, rayStartY, rayEndX, rayEndY, slot) {
        if (!slot.transformedVertices || slot.transformedVertices.length < 3) return null;

        const vertices = slot.transformedVertices;
        // Definir arestas: vertices[0] é o canto de 90°
        // Edge 0: vertices[0] -> vertices[1] = face reta vertical
        // Edge 1: vertices[1] -> vertices[2] = hipotenusa
        // Edge 2: vertices[2] -> vertices[0] = face reta horizontal
        const edges = [
            { start: vertices[0], end: vertices[1], isHypotenuse: false, index: 0 },
            { start: vertices[1], end: vertices[2], isHypotenuse: true, index: 1 },
            { start: vertices[2], end: vertices[0], isHypotenuse: false, index: 2 }
        ];

        // Encontrar primeira interseção (entrada no prisma)
        let entryHit = null;
        let entryDist = Infinity;
        let entryEdge = null;

        edges.forEach(edge => {
            const intersection = this.lineIntersection(
                rayStartX, rayStartY, rayEndX, rayEndY,
                edge.start.x, edge.start.y, edge.end.x, edge.end.y
            );

            if (intersection) {
                const dist = Math.hypot(intersection.x - rayStartX, intersection.y - rayStartY);
                if (dist < entryDist && dist > 2) {
                    entryDist = dist;
                    entryHit = intersection;
                    entryEdge = edge;
                }
            }
        });

        if (!entryHit) return null;

        const currentDir = Math.atan2(rayEndY - rayStartY, rayEndX - rayStartX) * 180 / Math.PI;

        // Se entrou pela HIPOTENUSA: passa direto
        if (entryEdge.isHypotenuse) {
            // Não refletir, apenas continuar na mesma direção
            // Mas precisamos encontrar o ponto de saída
            const rayLength = 200;
            const dirRad = currentDir * Math.PI / 180;
            const exitX = entryHit.x + Math.cos(dirRad) * rayLength;
            const exitY = entryHit.y + Math.sin(dirRad) * rayLength;

            // Encontrar saída pelas faces retas
            let exitHit = null;
            let exitDist = Infinity;

            edges.forEach(edge => {
                if (edge.isHypotenuse) return; // Não sair pela mesma face

                const intersection = this.lineIntersection(
                    entryHit.x, entryHit.y, exitX, exitY,
                    edge.start.x, edge.start.y, edge.end.x, edge.end.y
                );

                if (intersection) {
                    const dist = Math.hypot(intersection.x - entryHit.x, intersection.y - entryHit.y);
                    if (dist < exitDist && dist > 2) {
                        exitDist = dist;
                        exitHit = intersection;
                    }
                }
            });

            // Retornar ponto de saída com mesma direção
            return {
                point: exitHit || entryHit,
                distance: entryDist + (exitDist < Infinity ? exitDist : 0),
                newDirection: currentDir // Passa reto
            };
        }

        // Se entrou por FACE RETA: refletir na hipotenusa interna (90°)
        // Simular raio viajando internamente até a hipotenusa
        const rayLength = 200;
        const dirRad = currentDir * Math.PI / 180;
        const internalX = entryHit.x + Math.cos(dirRad) * rayLength;
        const internalY = entryHit.y + Math.sin(dirRad) * rayLength;

        // Encontrar interseção com a hipotenusa (interna)
        const hypotenuse = edges.find(e => e.isHypotenuse);
        const hypoHit = this.lineIntersection(
            entryHit.x, entryHit.y, internalX, internalY,
            hypotenuse.start.x, hypotenuse.start.y, hypotenuse.end.x, hypotenuse.end.y
        );

        if (hypoHit) {
            // Reflexão interna na hipotenusa: gira 90°
            // A direção de saída depende de qual face reta o raio entrou
            // entryEdge.index: 0 = face reta vertical, 2 = face reta horizontal
            const reflectedDir = this.calculateReflection(currentDir, slot.rotation, slot.flipX, entryEdge.index, slot);

            return {
                point: hypoHit,
                distance: entryDist + Math.hypot(hypoHit.x - entryHit.x, hypoHit.y - entryHit.y),
                newDirection: reflectedDir
            };
        }

        // Fallback: retornar entrada sem reflexão
        return {
            point: entryHit,
            distance: entryDist,
            newDirection: currentDir
        };
    }

    calculateReflection(incomingDir, prismRotation, flipX, entryEdgeIndex = 0, slot = null) {
        // Usar a geometria real do prisma para calcular a reflexão correta
        // A hipotenusa conecta vertices[1] a vertices[2]

        if (slot && slot.transformedVertices && slot.transformedVertices.length >= 3) {
            const vertices = slot.transformedVertices;
            // Hipotenusa: de vertices[1] para vertices[2]
            const hypoStart = vertices[1];
            const hypoEnd = vertices[2];

            // Vetor da hipotenusa
            const hypoVecX = hypoEnd.x - hypoStart.x;
            const hypoVecY = hypoEnd.y - hypoStart.y;

            // Normal da hipotenusa (perpendicular, apontando para dentro do prisma)
            // Para um triângulo com vértice 90° em vertices[0], a normal aponta "para fora" do triângulo
            // Precisamos a normal que aponta para o centro do triângulo (reflexão interna)
            const centerX = (vertices[0].x + vertices[1].x + vertices[2].x) / 3;
            const centerY = (vertices[0].y + vertices[1].y + vertices[2].y) / 3;
            const midHypoX = (hypoStart.x + hypoEnd.x) / 2;
            const midHypoY = (hypoStart.y + hypoEnd.y) / 2;

            // Normal perpendicular ao vetor da hipotenusa
            let normalX = -hypoVecY;
            let normalY = hypoVecX;

            // Verificar se a normal aponta para o centro do prisma (para dentro)
            const toCenterX = centerX - midHypoX;
            const toCenterY = centerY - midHypoY;
            const dotToCenter = normalX * toCenterX + normalY * toCenterY;

            // Se não aponta para o centro, inverter
            if (dotToCenter < 0) {
                normalX = -normalX;
                normalY = -normalY;
            }

            // Normalizar
            const normalLen = Math.sqrt(normalX * normalX + normalY * normalY);
            normalX /= normalLen;
            normalY /= normalLen;

            // Vetor de direção do raio incidente
            const incidentRad = incomingDir * Math.PI / 180;
            const incidentX = Math.cos(incidentRad);
            const incidentY = Math.sin(incidentRad);

            // Fórmula de reflexão: R = I - 2*(I·N)*N
            const dotIN = incidentX * normalX + incidentY * normalY;
            const reflectedX = incidentX - 2 * dotIN * normalX;
            const reflectedY = incidentY - 2 * dotIN * normalY;

            // Calcular ângulo de saída
            let outDir = Math.atan2(reflectedY, reflectedX) * 180 / Math.PI;
            outDir = ((outDir % 360) + 360) % 360;

            console.log('[PrismInScene] Reflexão calculada:', {
                incomingDir: incomingDir.toFixed(1),
                normal: { x: normalX.toFixed(2), y: normalY.toFixed(2) },
                outDir: outDir.toFixed(1)
            });

            return outDir;
        }

        // Fallback: usar método antigo se não tiver geometria
        let normalizedIn = Math.round(incomingDir / 90) * 90;
        normalizedIn = ((normalizedIn % 360) + 360) % 360;

        let effectiveRotation = prismRotation;
        if (flipX) effectiveRotation = (360 - prismRotation) % 360;

        let turnDirection;
        if (entryEdgeIndex === 0) {
            turnDirection = (effectiveRotation === 0 || effectiveRotation === 180) ? -90 : 90;
        } else {
            turnDirection = (effectiveRotation === 0 || effectiveRotation === 180) ? 90 : -90;
        }

        let outDir = normalizedIn + turnDirection;
        outDir = ((outDir % 360) + 360) % 360;

        return outDir;
    }

    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
        }
        return null;
    }

    rayRectIntersection(x1, y1, x2, y2, rx, ry, rw, rh) {
        const edges = [
            { x1: rx, y1: ry, x2: rx + rw, y2: ry },
            { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh },
            { x1: rx + rw, y1: ry + rh, x2: rx, y2: ry + rh },
            { x1: rx, y1: ry + rh, x2: rx, y2: ry }
        ];

        let closest = null;
        let minDist = Infinity;

        edges.forEach(edge => {
            const hit = this.lineIntersection(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2);
            if (hit) {
                const dist = Math.hypot(hit.x - x1, hit.y - y1);
                if (dist < minDist) {
                    minDist = dist;
                    closest = { x: hit.x, y: hit.y, distance: dist };
                }
            }
        });

        return closest;
    }

    onSolved() {
        if (this.solved) return;
        this.solved = true;

        console.log('[PrismInScene] 🎉 Puzzle resolvido!');

        try { this.scene.cameras.main.flash(500, 0, 255, 0); } catch (e) { }

        if (window.uiManager?.showNotification) {
            uiManager.showNotification('✅ Enigma de luz resolvido!');
        }

        if (window.gameStateManager?.solvePuzzle) {
            gameStateManager.solvePuzzle(this.config.id);
        }

        // Chamar callback onSolved da LocationScene (que atualiza o visual)
        if (this.config.onSolved) this.config.onSolved();

        // Dropar recompensa se houver
        if (this.config.reward) {
            this.scene.time.delayedCall(2000, () => this.dropReward());
        }

        // Destruir elementos do puzzle após um delay para dar tempo de ver o sucesso
        this.scene.time.delayedCall(1500, () => {
            this.destroy();

            // Forçar re-render do puzzle visual (afterImage)
            if (this.scene.renderPuzzle) {
                this.scene.renderPuzzle();
            }
        });
    }

    dropReward() {
        const reward = this.config.reward;
        if (!reward) return;

        if (window.gameStateManager) {
            gameStateManager.normalizeInventory();
            gameStateManager.state.inventory[reward.id] = {
                ...reward, status: 'dropped',
                dropLocation: this.scene.currentLocation,
                dropPosition: { x: 50, y: 70 }
            };
            gameStateManager.saveProgress();
        }

        if (window.uiManager?.showNotification) {
            uiManager.showNotification(`🎁 ${reward.name} apareceu!`);
        }

        if (this.scene.renderDroppedItems) this.scene.renderDroppedItems();
    }

    destroy() {
        if (this.instructionText) this.instructionText.destroy();
        if (this.rayGraphics) this.rayGraphics.destroy();
        if (this.emitter) {
            this.emitter.circle?.destroy();
            this.emitter.arrow?.destroy();
        }
        if (this.receptor) {
            this.receptor.rect?.destroy();
            this.receptor.target?.destroy();
        }
        this.prisms.forEach(slot => {
            slot.graphics?.destroy();
            slot.hitArea?.destroy();
            slot.lockIcon?.destroy();
            slot.slotCircle?.destroy();
            slot.itemLabel?.destroy();
        });
        if (this.container) this.container.destroy();
        this.prisms = [];
        this.active = false;
    }
}

if (typeof window !== 'undefined') {
    window.PrismLightPuzzleInScene = PrismLightPuzzleInScene;
}
