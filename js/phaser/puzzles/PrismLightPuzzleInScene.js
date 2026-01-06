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
        this.prisms = [];  // Slots de prisma
        this.solved = false;
        this.active = true;

        // Referências para interação
        this.dragging = null;
        this.dragOffset = { x: 0, y: 0 };
    }

    create() {
        if (this.config.solved || (this.config.id && gameStateManager?.isPuzzleSolved(this.config.id))) {
            this.solved = true;
            console.log('[PrismInScene] Puzzle já resolvido, não criando elementos interativos');
            return;
        }

        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();

        // Container para todos os elementos
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(200);

        // Graphics para o raio de luz
        this.rayGraphics = this.scene.add.graphics();
        this.rayGraphics.setDepth(190);

        // Criar elementos
        this.createEmitter(bgX, bgY, bgWidth, bgHeight);
        this.createReceptor(bgX, bgY, bgWidth, bgHeight);
        this.createPrismSlots(bgX, bgY, bgWidth, bgHeight);

        // Desenhar raio inicial
        this.updateRay(bgX, bgY, bgWidth, bgHeight);

        // Instruções
        this.showInstructions();

        console.log('[PrismInScene] Puzzle criado com', this.prisms.length, 'slots de prisma');
    }

    showInstructions() {
        const text = this.scene.add.text(
            this.scene.cameras.main.width / 2,
            30,
            '💡 Arraste prismas do inventário para os slots | Clique: Rotacionar | Botão Direito: Espelhar',
            {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#00ffff',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: { x: 15, y: 8 }
            }
        );
        text.setOrigin(0.5);
        text.setScrollFactor(0);
        text.setDepth(250);
        this.instructionText = text;

        // Esconder após 8 segundos
        this.scene.time.delayedCall(8000, () => {
            if (this.instructionText) {
                this.scene.tweens.add({
                    targets: this.instructionText,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        this.instructionText?.destroy();
                        this.instructionText = null;
                    }
                });
            }
        });
    }

    createEmitter(bgX, bgY, bgWidth, bgHeight) {
        const emitterConfig = this.config.emitter || { x: -300, y: 0, direction: 0, color: 0x00ff00 };

        // Converter coordenadas do puzzle para coordenadas da cena
        // No puzzle, x=0,y=0 é o centro, então precisamos converter
        const centerX = bgX + bgWidth / 2;
        const centerY = bgY + bgHeight / 2;

        const x = centerX + emitterConfig.x;
        const y = centerY + emitterConfig.y;

        // Círculo do emissor
        const emitterCircle = this.scene.add.circle(x, y, 18, emitterConfig.color);
        emitterCircle.setStrokeStyle(3, 0xffffff);
        emitterCircle.setDepth(200);

        // Seta indicando direção
        const arrowLength = 30;
        const dirRad = emitterConfig.direction * Math.PI / 180;
        const arrowGraphics = this.scene.add.graphics();
        arrowGraphics.lineStyle(4, emitterConfig.color);
        arrowGraphics.lineBetween(
            x, y,
            x + Math.cos(dirRad) * arrowLength,
            y + Math.sin(dirRad) * arrowLength
        );
        arrowGraphics.setDepth(201);

        this.emitter = {
            x: x,
            y: y,
            direction: emitterConfig.direction,
            color: emitterConfig.color,
            circle: emitterCircle,
            arrow: arrowGraphics
        };

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

        // Retângulo do receptor
        const receptorRect = this.scene.add.rectangle(x, y, width, height, 0xffff00, 0.3);
        receptorRect.setStrokeStyle(4, 0xffff00);
        receptorRect.setDepth(200);

        // Alvo no centro
        const targetGraphics = this.scene.add.graphics();
        targetGraphics.lineStyle(2, 0xffff00);
        targetGraphics.strokeCircle(x, y, 15);
        targetGraphics.strokeCircle(x, y, 8);
        targetGraphics.lineBetween(x - 20, y, x + 20, y);
        targetGraphics.lineBetween(x, y - 20, x, y + 20);
        targetGraphics.setDepth(201);

        this.receptor = {
            x: x,
            y: y,
            width: width,
            height: height,
            rect: receptorRect,
            target: targetGraphics
        };

        this.container.add(receptorRect);
    }

    createPrismSlots(bgX, bgY, bgWidth, bgHeight) {
        const slots = this.config.prismSlots || [];
        const centerX = bgX + bgWidth / 2;
        const centerY = bgY + bgHeight / 2;

        slots.forEach((slotConfig, index) => {
            const x = centerX + slotConfig.x;
            const y = centerY + slotConfig.y;

            // Verificar se este slot já foi preenchido anteriormente (salvo no estado)
            const slotId = slotConfig.id || `prism_slot_${index}`;
            const savedState = this.getSavedSlotState(slotId);

            // Dados do slot
            const slot = {
                id: slotId,
                x: x,
                y: y,
                requiredItem: slotConfig.requiredItem,
                filled: savedState !== null,  // Se tem estado salvo, está preenchido
                rotation: savedState?.rotation || 0,
                flipX: savedState?.flipX || false,
                graphics: null,
                hitArea: null,
                lockIcon: null,
                slotCircle: null,
                index: index
            };

            if (slot.filled) {
                // Slot já tem prisma - desenhar e tornar interativo
                this.drawPrism(slot);
                this.makePrismInteractive(slot, index);
            } else {
                // Slot vazio - mostrar área de drop
                this.drawEmptySlot(slot);
            }

            this.prisms.push(slot);
        });
    }

    drawEmptySlot(slot) {
        // Círculo indicando o slot vazio (área de drop)
        const slotCircle = this.scene.add.circle(slot.x, slot.y, 40, 0x444444, 0.3);
        slotCircle.setStrokeStyle(3, 0x00ffff);
        slotCircle.setDepth(199);
        slot.slotCircle = slotCircle;

        // Ícone de cadeado
        const lockIcon = this.scene.add.text(slot.x, slot.y, '🔒', {
            fontSize: '28px'
        }).setOrigin(0.5);
        lockIcon.setDepth(200);
        slot.lockIcon = lockIcon;

        // Texto indicando qual item é necessário
        const itemLabel = this.scene.add.text(slot.x, slot.y + 45, slot.requiredItem || 'prisma', {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        itemLabel.setDepth(200);
        slot.itemLabel = itemLabel;
    }

    drawPrism(slot) {
        // Remover gráfico anterior se existir
        if (slot.graphics) {
            slot.graphics.destroy();
        }

        const graphics = this.scene.add.graphics();
        const size = 35;

        // Vértices do triângulo reto
        let vertices = [
            { x: -size, y: size },   // Canto 90° (inferior esquerdo)
            { x: -size, y: -size },  // Superior esquerdo
            { x: size, y: size }     // Inferior direito
        ];

        // Aplicar flip se necessário
        if (slot.flipX) {
            vertices = vertices.map(v => ({ x: -v.x, y: v.y }));
        }

        // Aplicar rotação
        const angle = slot.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const transformedVertices = vertices.map(v => ({
            x: slot.x + (v.x * cos - v.y * sin),
            y: slot.y + (v.x * sin + v.y * cos)
        }));

        // Desenhar triângulo preenchido
        graphics.fillStyle(0x88ccff, 0.6);
        graphics.beginPath();
        graphics.moveTo(transformedVertices[0].x, transformedVertices[0].y);
        for (let i = 1; i < transformedVertices.length; i++) {
            graphics.lineTo(transformedVertices[i].x, transformedVertices[i].y);
        }
        graphics.closePath();
        graphics.fillPath();

        // Desenhar borda
        graphics.lineStyle(4, 0x00ffff, 1);
        graphics.beginPath();
        graphics.moveTo(transformedVertices[0].x, transformedVertices[0].y);
        for (let i = 1; i < transformedVertices.length; i++) {
            graphics.lineTo(transformedVertices[i].x, transformedVertices[i].y);
        }
        graphics.closePath();
        graphics.strokePath();

        // Marcar ângulo de 90° com um ponto laranja
        graphics.fillStyle(0xff6600, 1);
        graphics.fillCircle(transformedVertices[0].x, transformedVertices[0].y, 6);

        graphics.setDepth(205);
        slot.graphics = graphics;

        // Guardar vértices transformados para colisão
        slot.transformedVertices = transformedVertices;
    }

    makePrismInteractive(slot, index) {
        // Criar área de hit interativa
        const hitArea = this.scene.add.circle(slot.x, slot.y, 45, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.setDepth(210);

        // Clique esquerdo: rotacionar
        hitArea.on('pointerdown', (pointer) => {
            if (!pointer.rightButtonDown()) {
                this.rotatePrism(slot, index);
            }
        });

        // Clique direito: espelhar
        hitArea.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.flipPrism(slot, index);
            }
        });

        // Prevenir menu de contexto
        this.scene.input.mouse.disableContextMenu();

        slot.hitArea = hitArea;
    }

    /**
     * Chamado quando um item é dropado do inventário
     * Retorna true se o drop foi processado, false caso contrário
     */
    onDropFromInventory(itemId, worldX, worldY) {
        console.log('[PrismInScene] onDropFromInventory chamado:', { itemId, worldX, worldY });
        console.log('[PrismInScene] Slots disponíveis:', this.prisms.map(s => ({ id: s.id, filled: s.filled, requiredItem: s.requiredItem, x: s.x, y: s.y })));

        // Verificar se o item foi solto em algum slot vazio
        for (let slot of this.prisms) {
            if (slot.filled) continue;  // Slot já preenchido

            const distance = Phaser.Math.Distance.Between(worldX, worldY, slot.x, slot.y);
            console.log('[PrismInScene] Distância para slot', slot.id, ':', distance);

            // Se caiu dentro de 60px do centro do slot
            if (distance < 60) {
                // Verificar se é o item correto para este slot
                // Aceitar se: item exato OU se não tem requiredItem definido e o item é um prisma
                const isCorrectItem = (
                    itemId === slot.requiredItem ||
                    (!slot.requiredItem && itemId.startsWith('prisma')) ||
                    (slot.requiredItem && itemId.toLowerCase() === slot.requiredItem.toLowerCase())
                );

                console.log('[PrismInScene] Item correto?', isCorrectItem, '- itemId:', itemId, 'requiredItem:', slot.requiredItem);

                if (isCorrectItem) {
                    this.fillSlot(slot, itemId);
                    return true;
                } else {
                    // Item incorreto
                    if (window.uiManager?.showNotification) {
                        uiManager.showNotification(`Este slot precisa de: ${slot.requiredItem || 'prisma'}`);
                    }
                    return true;  // Processado, mesmo que incorreto
                }
            }
        }

        console.log('[PrismInScene] Item não foi dropado em nenhum slot');
        return false;  // Não foi dropado em nenhum slot
    }

    fillSlot(slot, itemId) {
        console.log('[PrismInScene] Preenchendo slot', slot.id, 'com item', itemId);

        slot.filled = true;

        // Remover ícones do slot vazio
        if (slot.lockIcon) {
            slot.lockIcon.destroy();
            slot.lockIcon = null;
        }
        if (slot.slotCircle) {
            slot.slotCircle.destroy();
            slot.slotCircle = null;
        }
        if (slot.itemLabel) {
            slot.itemLabel.destroy();
            slot.itemLabel = null;
        }

        // Desenhar o prisma
        this.drawPrism(slot);

        // Tornar interativo
        this.makePrismInteractive(slot, slot.index);

        // Flash de confirmação
        this.scene.cameras.main.flash(200, 0, 255, 255, false);

        // Som de encaixe
        if (this.scene.sound?.play) {
            this.scene.sound.play('click', { volume: 0.5 });
        }

        // Remover item do inventário
        if (window.gameStateManager) {
            delete gameStateManager.state.inventory[itemId];

            // Marcar como consumido
            if (!gameStateManager.state.consumedItems) {
                gameStateManager.state.consumedItems = [];
            }
            if (!gameStateManager.state.consumedItems.includes(itemId)) {
                gameStateManager.state.consumedItems.push(itemId);
            }

            // Salvar estado do slot
            this.saveSlotState(slot);

            gameStateManager.saveProgress();
            gameStateManager.trigger('inventoryChanged');
        }

        // Atualizar raio
        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
        this.updateRay(bgX, bgY, bgWidth, bgHeight);

        // Notificar
        if (window.uiManager?.showNotification) {
            uiManager.showNotification('✨ Prisma encaixado! Clique para rotacionar.');
        }
    }

    saveSlotState(slot) {
        if (!window.gameStateManager) return;

        // Salvar estado do prisma neste slot
        if (!gameStateManager.state.prismPuzzleSlots) {
            gameStateManager.state.prismPuzzleSlots = {};
        }

        const puzzleId = this.config.id || 'prism_puzzle';
        if (!gameStateManager.state.prismPuzzleSlots[puzzleId]) {
            gameStateManager.state.prismPuzzleSlots[puzzleId] = {};
        }

        gameStateManager.state.prismPuzzleSlots[puzzleId][slot.id] = {
            filled: slot.filled,
            rotation: slot.rotation,
            flipX: slot.flipX
        };
    }

    getSavedSlotState(slotId) {
        if (!window.gameStateManager) return null;

        const puzzleId = this.config.id || 'prism_puzzle';
        return gameStateManager.state.prismPuzzleSlots?.[puzzleId]?.[slotId] || null;
    }

    rotatePrism(slot, index) {
        if (this.solved || !slot.filled) return;

        slot.rotation = (slot.rotation + 90) % 360;
        this.drawPrism(slot);

        // Salvar estado
        this.saveSlotState(slot);
        if (window.gameStateManager) {
            gameStateManager.saveProgress();
        }

        // Atualizar raio
        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
        this.updateRay(bgX, bgY, bgWidth, bgHeight);

        // Som de clique
        if (this.scene.sound?.play) {
            this.scene.sound.play('click', { volume: 0.3 });
        }
    }

    flipPrism(slot, index) {
        if (this.solved || !slot.filled) return;

        slot.flipX = !slot.flipX;
        this.drawPrism(slot);

        // Salvar estado
        this.saveSlotState(slot);
        if (window.gameStateManager) {
            gameStateManager.saveProgress();
        }

        // Atualizar raio
        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
        this.updateRay(bgX, bgY, bgWidth, bgHeight);

        // Som de clique
        if (this.scene.sound?.play) {
            this.scene.sound.play('click', { volume: 0.3 });
        }
    }

    updateRay(bgX, bgY, bgWidth, bgHeight) {
        if (!this.rayGraphics) return;

        this.rayGraphics.clear();

        // Começar do emissor
        let currentX = this.emitter.x;
        let currentY = this.emitter.y;
        let currentDir = this.emitter.direction;
        const maxBounces = 20;
        let reachedReceptor = false;

        // Desenhar raio com glow
        this.rayGraphics.lineStyle(5, this.emitter.color, 1);
        this.rayGraphics.beginPath();
        this.rayGraphics.moveTo(currentX, currentY);

        for (let bounce = 0; bounce < maxBounces; bounce++) {
            // Calcular próximo ponto na direção atual
            const rayLength = 2000;
            const dirRad = currentDir * Math.PI / 180;
            const nextX = currentX + Math.cos(dirRad) * rayLength;
            const nextY = currentY + Math.sin(dirRad) * rayLength;

            // Verificar colisão com prismas PREENCHIDOS
            let closestHit = null;
            let closestDist = Infinity;

            this.prisms.forEach(slot => {
                if (!slot.filled || !slot.transformedVertices) return;

                const hit = this.rayPrismIntersection(
                    currentX, currentY, nextX, nextY,
                    slot
                );

                if (hit && hit.distance < closestDist && hit.distance > 2) {
                    closestHit = hit;
                    closestDist = hit.distance;
                }
            });

            // Verificar colisão com receptor
            const recHit = this.rayRectIntersection(
                currentX, currentY, nextX, nextY,
                this.receptor.x - this.receptor.width / 2,
                this.receptor.y - this.receptor.height / 2,
                this.receptor.width,
                this.receptor.height
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
                // Desenhar até a borda da cena
                const edgeX = Math.max(0, Math.min(this.scene.cameras.main.width, nextX));
                const edgeY = Math.max(0, Math.min(this.scene.cameras.main.height, nextY));
                this.rayGraphics.lineTo(edgeX, edgeY);
                break;
            }
        }

        this.rayGraphics.strokePath();

        // Efeito glow
        this.rayGraphics.lineStyle(12, this.emitter.color, 0.2);

        // Verificar solução
        if (reachedReceptor && !this.solved) {
            this.onSolved();
        }
    }

    rayPrismIntersection(rayStartX, rayStartY, rayEndX, rayEndY, slot) {
        if (!slot.transformedVertices || slot.transformedVertices.length < 3) return null;

        const vertices = slot.transformedVertices;

        // Definir arestas
        const edges = [
            { start: vertices[0], end: vertices[1], isHypotenuse: false },
            { start: vertices[1], end: vertices[2], isHypotenuse: true },
            { start: vertices[2], end: vertices[0], isHypotenuse: false }
        ];

        let closestHit = null;
        let closestDist = Infinity;

        edges.forEach(edge => {
            const intersection = this.lineIntersection(
                rayStartX, rayStartY, rayEndX, rayEndY,
                edge.start.x, edge.start.y, edge.end.x, edge.end.y
            );

            if (intersection) {
                const dist = Math.hypot(
                    intersection.x - rayStartX,
                    intersection.y - rayStartY
                );

                if (dist < closestDist && dist > 2) {
                    closestDist = dist;

                    const currentDir = Math.atan2(rayEndY - rayStartY, rayEndX - rayStartX) * 180 / Math.PI;
                    let newDir;

                    if (edge.isHypotenuse) {
                        // Hipotenusa: passa reto
                        newDir = currentDir;
                    } else {
                        // Face reta: reflete 90°
                        newDir = this.calculateReflection(currentDir, slot.rotation, slot.flipX);
                    }

                    closestHit = {
                        point: intersection,
                        distance: dist,
                        newDirection: newDir,
                        hitHypotenuse: edge.isHypotenuse
                    };
                }
            }
        });

        return closestHit;
    }

    calculateReflection(incomingDir, prismRotation, flipX) {
        let normalizedIn = Math.round(incomingDir / 90) * 90;
        normalizedIn = ((normalizedIn % 360) + 360) % 360;

        const reflectionMap = {
            0: { 0: 270, 90: 180, 180: 90, 270: 0 },
            90: { 0: 90, 90: 0, 180: 270, 270: 180 },
            180: { 0: 90, 90: 0, 180: 270, 270: 180 },
            270: { 0: 270, 90: 180, 180: 90, 270: 0 }
        };

        let effectiveRotation = prismRotation;
        if (flipX) {
            effectiveRotation = (360 - prismRotation) % 360;
        }

        const outDir = reflectionMap[effectiveRotation]?.[normalizedIn];
        return outDir !== undefined ? outDir : normalizedIn + 90;
    }

    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
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

        // Efeito visual de sucesso
        this.scene.cameras.main.flash(500, 0, 255, 0);

        // Som de sucesso
        if (this.scene.sound?.play) {
            this.scene.sound.play('puzzle_solved', { volume: 0.5 });
        }

        // Notificação
        if (window.uiManager?.showNotification) {
            window.uiManager.showNotification('✅ Enigma de luz resolvido!');
        }

        // Salvar progresso
        if (window.gameStateManager?.solvePuzzle) {
            window.gameStateManager.solvePuzzle(this.config.id);
        }

        // Executar callback se existir
        if (this.config.onSolved) {
            this.config.onSolved();
        }

        // Executar ação de desbloqueio após delay
        if (this.config.onUnlockedAction) {
            this.scene.time.delayedCall(1500, () => {
                this.executeUnlockAction(this.config.onUnlockedAction);
            });
        }

        // Dropar recompensa se existir
        if (this.config.reward) {
            this.scene.time.delayedCall(2000, () => {
                this.dropReward();
            });
        }
    }

    dropReward() {
        const reward = this.config.reward;
        if (!reward) return;

        const dropPosition = { x: 50, y: 70 };

        if (window.gameStateManager) {
            gameStateManager.normalizeInventory();
            gameStateManager.state.inventory[reward.id] = {
                ...reward,
                status: 'dropped',
                dropLocation: this.scene.currentLocation,
                dropPosition: dropPosition
            };
            gameStateManager.saveProgress();
        }

        if (window.uiManager?.showNotification) {
            window.uiManager.showNotification(`🎁 ${reward.name} apareceu!`);
        }

        // Renderizar item dropado
        if (this.scene.renderDroppedItems) {
            this.scene.renderDroppedItems();
        }
    }

    executeUnlockAction(action) {
        if (!action) return;

        switch (action.type) {
            case 'navigate':
                if (window.gameStateManager?.changeLocation) {
                    window.gameStateManager.changeLocation(action.targetLocation);
                }
                break;
            case 'changeBackground':
                if (action.newBackground && this.scene.background) {
                    const newKey = `bg_${this.scene.currentLocation}_after`;
                    this.scene.load.image(newKey, action.newBackground);
                    this.scene.load.once('complete', () => {
                        if (this.scene.textures.exists(newKey)) {
                            this.scene.background.setTexture(newKey);
                        }
                    });
                    this.scene.load.start();
                }
                if (action.message && window.uiManager?.showNotification) {
                    window.uiManager.showNotification(action.message);
                }
                break;
            case 'unlock_item':
                if (action.itemId && window.inventoryManager?.addItem) {
                    window.inventoryManager.addItem(action.itemId);
                }
                break;
        }
    }

    destroy() {
        // Limpar todos os elementos
        if (this.instructionText) {
            this.instructionText.destroy();
        }

        if (this.rayGraphics) {
            this.rayGraphics.destroy();
        }

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

        if (this.container) {
            this.container.destroy();
        }

        this.prisms = [];
        this.active = false;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PrismLightPuzzleInScene = PrismLightPuzzleInScene;
}
