/**
 * PrismLightPuzzle
 * Puzzle de prisma de luz - jogador posiciona prismas para guiar raio até receptor
 */
class PrismLightPuzzle {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.container = null;
        this.emitter = null;
        this.receptor = null;
        this.prismSlots = [];
        this.rayGraphics = null;
        this.solved = false;
    }

    create(centerX, centerY) {
        // Container principal
        this.container = this.scene.add.container(centerX, centerY);
        this.container.setDepth(1000);

        // Background escuro
        const bg = this.scene.add.rectangle(0, 0, 800, 600, 0x000000, 0.95);
        bg.setInteractive();
        bg.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.close();
            }
        });
        this.container.add(bg);

        // Título
        const title = this.scene.add.text(0, -280, this.config.title || 'Prisma de Luz', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.container.add(title);

        // Instruções
        const instructions = this.scene.add.text(0, -240,
            'Clique: Rotacionar | Botão Direito: Espelhar | ESC: Fechar', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.container.add(instructions);

        // Graphics para desenhar o raio
        this.rayGraphics = this.scene.add.graphics();
        this.container.add(this.rayGraphics);

        // Criar emissor de luz
        this.createEmitter();

        // Criar receptor
        this.createReceptor();

        // Criar slots de prismas
        this.createPrismSlots();

        // Desenhar raio inicial
        this.updateRay();

        // ESC para fechar
        this.scene.input.keyboard.once('keydown-ESC', () => this.close());
    }

    createEmitter() {
        const emitterConfig = this.config.emitter || { x: -300, y: 0, direction: 0, color: 0x00ff00 };

        // Círculo do emissor
        const emitterCircle = this.scene.add.circle(
            emitterConfig.x,
            emitterConfig.y,
            15,
            emitterConfig.color
        );
        this.container.add(emitterCircle);

        // Seta indicando direção
        const arrow = this.scene.add.triangle(
            emitterConfig.x + 25 * Math.cos(emitterConfig.direction * Math.PI / 180),
            emitterConfig.y + 25 * Math.sin(emitterConfig.direction * Math.PI / 180),
            0, -10, 20, 0, 0, 10,
            emitterConfig.color
        );
        arrow.setRotation(emitterConfig.direction * Math.PI / 180);
        this.container.add(arrow);

        this.emitter = {
            x: emitterConfig.x,
            y: emitterConfig.y,
            direction: emitterConfig.direction,
            color: emitterConfig.color
        };
    }

    createReceptor() {
        const receptorConfig = this.config.receptor || { x: 300, y: 0, width: 40, height: 40 };

        // Quadrado do receptor
        const receptorRect = this.scene.add.rectangle(
            receptorConfig.x,
            receptorConfig.y,
            receptorConfig.width,
            receptorConfig.height,
            0xffff00,
            0.3
        );
        receptorRect.setStrokeStyle(3, 0xffff00);
        this.container.add(receptorRect);

        // Ícone de alvo
        const targetGraphics = this.scene.add.graphics();
        targetGraphics.lineStyle(2, 0xffff00);
        targetGraphics.strokeCircle(receptorConfig.x, receptorConfig.y, 15);
        targetGraphics.strokeCircle(receptorConfig.x, receptorConfig.y, 8);
        targetGraphics.lineBetween(
            receptorConfig.x - 20, receptorConfig.y,
            receptorConfig.x + 20, receptorConfig.y
        );
        targetGraphics.lineBetween(
            receptorConfig.x, receptorConfig.y - 20,
            receptorConfig.x, receptorConfig.y + 20
        );
        this.container.add(targetGraphics);

        this.receptor = {
            x: receptorConfig.x,
            y: receptorConfig.y,
            width: receptorConfig.width,
            height: receptorConfig.height
        };
    }

    createPrismSlots() {
        const slots = this.config.prismSlots || [];

        // Carregar estado salvo dos prismas
        const savedState = this.loadPrismState();

        slots.forEach(slotConfig => {
            // Carregar estado salvo para este slot
            const slotState = savedState[slotConfig.id] || null;

            // Se tem estado salvo, o prisma já está instalado. Senão, verifica inventário
            const hasItem = slotState ? true : this.checkInventoryForItem(slotConfig.requiredItem);

            // Círculo do slot
            const slotCircle = this.scene.add.circle(
                slotConfig.x,
                slotConfig.y,
                30,
                0x444444,
                0.5
            );
            slotCircle.setStrokeStyle(2, hasItem ? 0x00ff00 : 0xff0000);
            this.container.add(slotCircle);

            // Dados do slot
            const slot = {
                id: slotConfig.id,
                x: slotConfig.x,
                y: slotConfig.y,
                requiredItem: slotConfig.requiredItem,
                hasItem: hasItem,
                rotation: slotState ? slotState.rotation : 0,
                flipX: slotState ? slotState.flipX : false,
                graphics: null,
                circle: slotCircle
            };

            if (hasItem) {
                // Desenhar triângulo do prisma
                this.drawPrism(slot);

                // Tornar interativo
                slotCircle.setInteractive({ cursor: 'pointer' });

                // Clique esquerdo: rotacionar
                slotCircle.on('pointerdown', (pointer) => {
                    if (!pointer.rightButtonDown()) {
                        this.rotatePrism(slot);
                    }
                });

                // Clique direito: espelhar
                slotCircle.on('pointerdown', (pointer) => {
                    if (pointer.rightButtonDown()) {
                        this.flipPrism(slot);
                        pointer.event.preventDefault();
                    }
                });
            } else {
                // Mostrar que falta o item
                const lockIcon = this.scene.add.text(
                    slotConfig.x, slotConfig.y, '🔒', {
                    fontSize: '24px'
                }).setOrigin(0.5);
                this.container.add(lockIcon);
            }

            this.prismSlots.push(slot);
        });

        // Salvar estado inicial (para garantir que prismas colocados agora sejam salvos)
        this.savePrismState();
    }

    drawPrism(slot) {
        // Remover gráfico anterior se existir
        if (slot.graphics) {
            slot.graphics.destroy();
        }

        // Criar novo gráfico
        const graphics = this.scene.add.graphics();

        // Triângulo retângulo (90° no canto)
        const size = 40;
        graphics.fillStyle(0x88ccff, 0.6);
        graphics.lineStyle(3, 0x00ffff, 1);

        // Vértices do triângulo reto (antes de rotação e flip)
        const vertices = [
            { x: -size/2, y: size/2 },   // Canto inferior esquerdo (90°)
            { x: -size/2, y: -size/2 },  // Canto superior esquerdo
            { x: size/2, y: size/2 }     // Canto inferior direito
        ];

        // Aplicar flip se necessário
        let transformedVertices = vertices;
        if (slot.flipX) {
            transformedVertices = vertices.map(v => ({ x: -v.x, y: v.y }));
        }

        // Desenhar triângulo
        graphics.beginPath();
        graphics.moveTo(
            slot.x + transformedVertices[0].x,
            slot.y + transformedVertices[0].y
        );
        transformedVertices.forEach(v => {
            graphics.lineTo(slot.x + v.x, slot.y + v.y);
        });
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();

        // Marcar ângulo de 90° com um ponto laranja
        graphics.fillStyle(0xff6600, 1);
        graphics.fillCircle(
            slot.x + transformedVertices[0].x,
            slot.y + transformedVertices[0].y,
            5
        );

        // Aplicar rotação ao container gráfico
        graphics.setRotation(slot.rotation * Math.PI / 180);
        graphics.setPosition(slot.x, slot.y);
        graphics.setPosition(0, 0);

        this.container.add(graphics);
        slot.graphics = graphics;
    }

    rotatePrism(slot) {
        slot.rotation = (slot.rotation + 90) % 360;
        this.drawPrism(slot);
        this.updateRay();
        this.savePrismState();
        this.scene.sound.play('click', { volume: 0.3 });
    }

    flipPrism(slot) {
        slot.flipX = !slot.flipX;
        this.drawPrism(slot);
        this.updateRay();
        this.savePrismState();
        this.scene.sound.play('click', { volume: 0.3 });
    }

    loadPrismState() {
        // Carregar estado dos prismas do localStorage
        const puzzleId = this.config.id || 'prism_light_puzzle';
        const savedData = localStorage.getItem(`prism_state_${puzzleId}`);
        if (savedData) {
            try {
                return JSON.parse(savedData);
            } catch (e) {
                console.error('Erro ao carregar estado dos prismas:', e);
            }
        }
        return {};
    }

    savePrismState() {
        // Salvar estado dos prismas no localStorage
        const puzzleId = this.config.id || 'prism_light_puzzle';
        const state = {};
        this.prismSlots.forEach(slot => {
            if (slot.hasItem) {
                state[slot.id] = {
                    rotation: slot.rotation,
                    flipX: slot.flipX
                };
            }
        });
        localStorage.setItem(`prism_state_${puzzleId}`, JSON.stringify(state));
    }

    updateRay() {
        this.rayGraphics.clear();

        // Começar do emissor
        let currentX = this.emitter.x;
        let currentY = this.emitter.y;
        let currentDir = this.emitter.direction;
        const maxBounces = 20;
        let reachedReceptor = false;

        // Desenhar raio com glow
        this.rayGraphics.lineStyle(4, this.emitter.color, 1);
        this.rayGraphics.beginPath();
        this.rayGraphics.moveTo(currentX, currentY);

        for (let bounce = 0; bounce < maxBounces; bounce++) {
            // Calcular próximo ponto na direção atual
            const rayLength = 1000;
            const nextX = currentX + Math.cos(currentDir * Math.PI / 180) * rayLength;
            const nextY = currentY + Math.sin(currentDir * Math.PI / 180) * rayLength;

            // Verificar colisão com prismas
            let closestHit = null;
            let closestDist = Infinity;

            this.prismSlots.forEach(slot => {
                if (!slot.hasItem) return;

                const hit = this.rayPrismIntersection(
                    currentX, currentY, nextX, nextY,
                    slot
                );

                if (hit && hit.distance < closestDist) {
                    closestHit = hit;
                    closestDist = hit.distance;
                }
            });

            if (closestHit) {
                // Desenhar até o ponto de colisão
                this.rayGraphics.lineTo(closestHit.point.x, closestHit.point.y);

                // Atualizar posição e direção
                currentX = closestHit.point.x;
                currentY = closestHit.point.y;
                currentDir = closestHit.newDirection;

                // Se bateu na hipotenusa, passa reto (sem mudança de direção)
                if (closestHit.hitHypotenuse) {
                    // Continua na mesma direção
                } else {
                    // Bateu em face reta, girou 90°
                    this.rayGraphics.strokePath();
                    this.rayGraphics.beginPath();
                    this.rayGraphics.moveTo(currentX, currentY);
                }
            } else {
                // Sem colisão, desenhar até a borda
                const edgePoint = this.rayToEdge(currentX, currentY, currentDir);
                this.rayGraphics.lineTo(edgePoint.x, edgePoint.y);
                break;
            }

            // Verificar se atingiu o receptor
            if (this.checkReceptorHit(currentX, currentY, currentDir)) {
                reachedReceptor = true;
                break;
            }
        }

        this.rayGraphics.strokePath();

        // Adicionar efeito glow
        this.rayGraphics.lineStyle(8, this.emitter.color, 0.3);
        this.rayGraphics.strokePath();

        // Verificar solução
        if (reachedReceptor && !this.solved) {
            this.onSolved();
        }
    }

    rayPrismIntersection(rayStartX, rayStartY, rayEndX, rayEndY, slot) {
        // Calcular vértices do triângulo com rotação e flip
        const size = 40;
        let vertices = [
            { x: -size/2, y: size/2 },   // 90° angle
            { x: -size/2, y: -size/2 },
            { x: size/2, y: size/2 }
        ];

        // Aplicar flip
        if (slot.flipX) {
            vertices = vertices.map(v => ({ x: -v.x, y: v.y }));
        }

        // Aplicar rotação
        const angle = slot.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        vertices = vertices.map(v => ({
            x: slot.x + (v.x * cos - v.y * sin),
            y: slot.y + (v.x * sin + v.y * cos)
        }));

        // Definir arestas
        const edges = [
            { start: vertices[0], end: vertices[1], isHypotenuse: false, index: 0 }, // Face reta 1
            { start: vertices[1], end: vertices[2], isHypotenuse: true, index: 1 },  // Hipotenusa
            { start: vertices[2], end: vertices[0], isHypotenuse: false, index: 2 }  // Face reta 2
        ];

        // Encontrar primeira interseção (ponto de entrada)
        let entryHit = null;
        let entryDist = Infinity;
        let entryEdge = null;

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

                if (dist < entryDist && dist > 0.1) {
                    entryDist = dist;
                    entryHit = intersection;
                    entryEdge = edge;
                }
            }
        });

        if (!entryHit) return null;

        const currentDir = Math.atan2(rayEndY - rayStartY, rayEndX - rayStartX) * 180 / Math.PI;

        // Debug: verificar qual aresta foi atingida
        console.log(`Prisma rot=${slot.rotation}, flip=${slot.flipX}, entrada: edge ${entryEdge.index}, isHypo=${entryEdge.isHypotenuse}, dir=${currentDir.toFixed(1)}°`);

        // Se ENTROU pela HIPOTENUSA: passa direto através do prisma (sem bater na hipotenusa)
        if (entryEdge.isHypotenuse) {
            const rayLength = 200;
            const dirRad = currentDir * Math.PI / 180;
            const exitX = entryHit.x + Math.cos(dirRad) * rayLength;
            const exitY = entryHit.y + Math.sin(dirRad) * rayLength;

            // Procurar ponto de saída
            let exitHit = null;
            let exitDist = Infinity;

            edges.forEach(edge => {
                if (edge.isHypotenuse) return; // Não sai pela mesma hipotenusa
                const intersection = this.lineIntersection(
                    entryHit.x, entryHit.y, exitX, exitY,
                    edge.start.x, edge.start.y, edge.end.x, edge.end.y
                );
                if (intersection) {
                    const dist = Math.hypot(intersection.x - entryHit.x, intersection.y - entryHit.y);
                    if (dist < exitDist && dist > 0.1) {
                        exitDist = dist;
                        exitHit = intersection;
                    }
                }
            });

            return {
                point: exitHit || entryHit,
                distance: entryDist + (exitDist < Infinity ? exitDist : 0),
                newDirection: currentDir,
                hitHypotenuse: false  // NÃO bateu na hipotenusa, passou direto
            };
        }

        // Se ENTROU por FACE RETA: viaja internamente até BATER na hipotenusa, reflete 90°, e sai pela outra face
        const rayLength = 200;
        const dirRad = currentDir * Math.PI / 180;
        const internalX = entryHit.x + Math.cos(dirRad) * rayLength;
        const internalY = entryHit.y + Math.sin(dirRad) * rayLength;

        // Encontrar onde bate na hipotenusa interna
        const hypotenuse = edges.find(e => e.isHypotenuse);
        const hypoHit = this.lineIntersection(
            entryHit.x, entryHit.y, internalX, internalY,
            hypotenuse.start.x, hypotenuse.start.y, hypotenuse.end.x, hypotenuse.end.y
        );

        if (hypoHit) {
            // Calcular reflexão de 90°
            const reflectedDir = this.calculateReflection(currentDir, slot.rotation, slot.flipX, entryEdge.index);

            // Calcular ponto de saída pela outra face reta
            const reflectedRad = reflectedDir * Math.PI / 180;
            const exitX = hypoHit.x + Math.cos(reflectedRad) * rayLength;
            const exitY = hypoHit.y + Math.sin(reflectedRad) * rayLength;

            // Encontrar ponto de saída
            let exitHit = null;
            let exitDist = Infinity;

            edges.forEach(edge => {
                if (edge.isHypotenuse) return; // Não sai pela hipotenusa
                const intersection = this.lineIntersection(
                    hypoHit.x, hypoHit.y, exitX, exitY,
                    edge.start.x, edge.start.y, edge.end.x, edge.end.y
                );
                if (intersection) {
                    const dist = Math.hypot(intersection.x - hypoHit.x, intersection.y - hypoHit.y);
                    if (dist < exitDist && dist > 0.1) {
                        exitDist = dist;
                        exitHit = intersection;
                    }
                }
            });

            if (exitHit) {
                const totalDist = entryDist +
                                Math.hypot(hypoHit.x - entryHit.x, hypoHit.y - entryHit.y) +
                                Math.hypot(exitHit.x - hypoHit.x, exitHit.y - hypoHit.y);

                return {
                    point: exitHit,
                    distance: totalDist,
                    newDirection: reflectedDir,
                    hitHypotenuse: true,  // SIM bateu na hipotenusa e refletiu!
                    internalPath: { entry: entryHit, reflection: hypoHit, exit: exitHit }
                };
            }
        }

        return {
            point: entryHit,
            distance: entryDist,
            newDirection: currentDir,
            hitHypotenuse: false
        };
    }

    calculateReflection(incomingDir, prismRotation, flipX, entryEdgeIndex = 0) {
        // Simplificação: para um prisma triangular retângulo (45-45-90),
        // quando a luz entra por uma face reta e bate na hipotenusa, sempre reflete 90°

        // Determinar orientação da hipotenusa baseado na rotação e flip
        // Hipotenusa base (rot=0, no flip) vai de (-20,-20) para (20,20) → diagonal \

        // Calcular o ângulo da hipotenusa
        let hypoAngle = 45 + prismRotation; // diagonal base a 45°

        if (flipX) {
            // Flip horizontal inverte o ângulo: 45° vira 135°, etc
            hypoAngle = 180 - (45 + prismRotation);
        }

        hypoAngle = ((hypoAngle % 360) + 360) % 360;

        // Para reflexão em uma superfície a 45° (ou múltiplos), a regra é simples:
        // Se a hipotenusa está em 45°: horizontal (0°) vira vertical para baixo (90°)
        // Se a hipotenusa está em 135°: horizontal (0°) vira vertical para cima (270°)
        // Se a hipotenusa está em 225°: vertical para baixo (90°) vira horizontal para direita (0°)
        // Se a hipotenusa está em 315°: vertical para cima (270°) vira horizontal para direita (0°)

        // Fórmula geral para espelho a 45°: outDir = 2 * hypoAngle - incomingDir
        let outDir = 2 * hypoAngle - incomingDir;
        outDir = ((outDir % 360) + 360) % 360;

        return outDir;
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

    rayToEdge(x, y, direction) {
        const rayLength = 1000;
        return {
            x: x + Math.cos(direction * Math.PI / 180) * rayLength,
            y: y + Math.sin(direction * Math.PI / 180) * rayLength
        };
    }

    checkReceptorHit(x, y, direction) {
        // Calcular próximo segmento do raio
        const rayLength = 100;
        const nextX = x + Math.cos(direction * Math.PI / 180) * rayLength;
        const nextY = y + Math.sin(direction * Math.PI / 180) * rayLength;

        // Verificar se o raio passa pelo receptor
        const receptorBounds = {
            left: this.receptor.x - this.receptor.width / 2,
            right: this.receptor.x + this.receptor.width / 2,
            top: this.receptor.y - this.receptor.height / 2,
            bottom: this.receptor.y + this.receptor.height / 2
        };

        // Verificar interseção linha-retângulo
        return this.lineRectIntersection(
            x, y, nextX, nextY,
            receptorBounds
        );
    }

    lineRectIntersection(x1, y1, x2, y2, rect) {
        // Verificar interseção com cada borda do retângulo
        const edges = [
            { x1: rect.left, y1: rect.top, x2: rect.right, y2: rect.top },     // Top
            { x1: rect.right, y1: rect.top, x2: rect.right, y2: rect.bottom }, // Right
            { x1: rect.right, y1: rect.bottom, x2: rect.left, y2: rect.bottom }, // Bottom
            { x1: rect.left, y1: rect.bottom, x2: rect.left, y2: rect.top }    // Left
        ];

        return edges.some(edge =>
            this.lineIntersection(x1, y1, x2, y2, edge.x1, edge.y1, edge.x2, edge.y2)
        );
    }

    checkInventoryForItem(itemId) {
        // Verificar se o jogador tem o item no inventário
        if (window.inventoryManager) {
            return window.inventoryManager.hasItem(itemId);
        }
        return false;
    }

    onSolved() {
        this.solved = true;

        // Efeito visual de sucesso
        this.scene.cameras.main.flash(500, 0, 255, 0);
        this.scene.sound.play('puzzle_solved', { volume: 0.5 });

        // Salvar progresso
        if (window.gameStateManager) {
            window.gameStateManager.solvePuzzle(this.config.id);
        }

        // Executar ação de desbloqueio
        if (this.config.onUnlockedAction) {
            setTimeout(() => {
                this.executeUnlockAction(this.config.onUnlockedAction);
            }, 1000);
        }

        // Fechar puzzle após 2 segundos
        setTimeout(() => {
            this.close();
        }, 2000);
    }

    executeUnlockAction(action) {
        switch (action.type) {
            case 'navigate':
                if (window.gameStateManager) {
                    window.gameStateManager.changeLocation(action.targetLocation);
                }
                break;
            case 'change_background':
                // Implementar mudança de background
                break;
            case 'unlock_item':
                if (window.inventoryManager) {
                    window.inventoryManager.addItem(action.itemId);
                }
                break;
        }
    }

    close() {
        if (this.container) {
            this.container.destroy();
        }
        if (this.rayGraphics) {
            this.rayGraphics.destroy();
        }
    }

    destroy() {
        this.close();
    }
}
