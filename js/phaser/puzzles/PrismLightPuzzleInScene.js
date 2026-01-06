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

        // PRIMEIRO: Remover item do inventário
        console.log('[PrismInScene] gameStateManager existe?', !!window.gameStateManager);
        console.log('[PrismInScene] inventory existe?', !!window.gameStateManager?.state?.inventory);
        console.log('[PrismInScene] itemId no inventory?', !!window.gameStateManager?.state?.inventory?.[itemId]);

        if (window.gameStateManager) {
            console.log('[PrismInScene] Removendo item do inventário:', itemId);

            // Garantir que inventory existe
            if (!gameStateManager.state.inventory) {
                gameStateManager.state.inventory = {};
            }

            // Deletar o item
            if (gameStateManager.state.inventory[itemId]) {
                delete gameStateManager.state.inventory[itemId];
                console.log('[PrismInScene] Item deletado do inventory');
            } else {
                console.log('[PrismInScene] Item não encontrado no inventory');
            }

            // Marcar como consumido
            if (!gameStateManager.state.consumedItems) gameStateManager.state.consumedItems = [];
            if (!gameStateManager.state.consumedItems.includes(itemId)) {
                gameStateManager.state.consumedItems.push(itemId);
            }

            // Salvar imediatamente
            gameStateManager.saveProgress();
            console.log('[PrismInScene] Progresso salvo');

            // Atualizar UI
            if (gameStateManager.trigger) gameStateManager.trigger('inventoryChanged');
            if (window.uiManager && uiManager.renderInventory) {
                uiManager.renderInventory();
                console.log('[PrismInScene] UI do inventário atualizada');
            }
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
        if (!window.gameStateManager) return;

        if (!gameStateManager.state.prismPuzzleSlots) gameStateManager.state.prismPuzzleSlots = {};

        const puzzleId = this.config.id || 'prism_puzzle';
        if (!gameStateManager.state.prismPuzzleSlots[puzzleId]) {
            gameStateManager.state.prismPuzzleSlots[puzzleId] = {};
        }

        gameStateManager.state.prismPuzzleSlots[puzzleId][slot.id] = {
            filled: slot.filled, rotation: slot.rotation, flipX: slot.flipX
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
        this.saveSlotState(slot);
        if (window.gameStateManager) gameStateManager.saveProgress();

        const { bgWidth, bgHeight, bgX, bgY } = this.scene.getBackgroundBounds();
        this.updateRay(bgX, bgY, bgWidth, bgHeight);
    }

    flipPrism(slot, index) {
        if (this.solved || !slot.filled) return;

        slot.flipX = !slot.flipX;
        this.drawPrism(slot);
        this.saveSlotState(slot);
        if (window.gameStateManager) gameStateManager.saveProgress();

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
                const dist = Math.hypot(intersection.x - rayStartX, intersection.y - rayStartY);

                if (dist < closestDist && dist > 2) {
                    closestDist = dist;
                    const currentDir = Math.atan2(rayEndY - rayStartY, rayEndX - rayStartX) * 180 / Math.PI;
                    let newDir = edge.isHypotenuse ? currentDir : this.calculateReflection(currentDir, slot.rotation, slot.flipX);

                    closestHit = { point: intersection, distance: dist, newDirection: newDir };
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
        if (flipX) effectiveRotation = (360 - prismRotation) % 360;

        const outDir = reflectionMap[effectiveRotation]?.[normalizedIn];
        return outDir !== undefined ? outDir : normalizedIn + 90;
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

        if (this.config.onSolved) this.config.onSolved();

        if (this.config.reward) {
            this.scene.time.delayedCall(2000, () => this.dropReward());
        }
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
