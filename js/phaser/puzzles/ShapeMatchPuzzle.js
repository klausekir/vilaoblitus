/**
 * ShapeMatchPuzzle.js
 * Puzzle de encaixe de formas - arraste objetos do inventário para moldes na cena
 *
 * Os moldes são invisíveis - posicione sobre imagens de fundo que mostram as formas
 */

class ShapeMatchPuzzle {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.molds = [];
        this.solved = false;
    }

    create() {
        if (this.config.molds && Array.isArray(this.config.molds)) {
            this.config.molds.forEach((moldConfig, index) => {
                this.createMold(moldConfig, index, this.config.solved);
            });

            if (this.config.solved) {
                this.solved = true;
            }
        }
    }

    createMold(moldConfig, index, alreadySolved = false) {
        let { x, y, shape, item } = moldConfig;

        // Converter coordenadas de pixels para porcentagem (compatibilidade)
        const bounds = this.scene.getBackgroundBounds();
        if (x > 100) x = (x / bounds.bgWidth) * 100;
        if (y > 100) y = (y / bounds.bgHeight) * 100;

        // Converter porcentagem para mundo
        const worldPos = this.scene.percentToWorld({ x, y });

        // Container invisível para área de drop
        const moldContainer = this.scene.add.container(worldPos.x, worldPos.y);
        moldContainer.setDepth(100);

        // Hitbox invisível
        const moldBg = this.scene.add.graphics();
        moldBg.lineStyle(0);
        moldBg.fillStyle(0x00ff00, 0);
        moldBg.fillCircle(0, 0, 50);
        moldContainer.add(moldBg);

        const moldData = {
            container: moldContainer,
            config: moldConfig,
            shape: shape,
            item: item,
            filled: alreadySolved,
            graphics: moldBg
        };

        this.molds.push(moldData);
        return moldData;
    }

    onDropToMold(mold, draggedObject) {
        if (draggedObject.itemData && draggedObject.itemData.id === mold.item) {
            this.fillMold(mold, draggedObject);
        } else {
            this.rejectItem(draggedObject);
        }
    }

    fillMold(mold, draggedObject) {
        if (mold.filled) return;
        mold.filled = true;

        // Flash branco de confirmação
        const filledGraphics = this.scene.add.graphics();
        filledGraphics.lineStyle(0);
        filledGraphics.fillStyle(0xffffff, 0.5);
        filledGraphics.fillCircle(0, 0, 55);
        mold.container.add(filledGraphics);
        mold.filledGraphics = filledGraphics;

        this.scene.tweens.add({
            targets: filledGraphics,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut'
        });

        // ✅ NOVO: Manter item visível mas travado no lugar
        if (draggedObject.itemData && typeof gameStateManager !== 'undefined') {
            const itemId = draggedObject.itemData.id;

            // Remover do inventário
            delete gameStateManager.state.inventory[itemId];

            // Marcar como consumido
            if (!gameStateManager.state.consumedItems) {
                gameStateManager.state.consumedItems = [];
            }
            if (!gameStateManager.state.consumedItems.includes(itemId)) {
                gameStateManager.state.consumedItems.push(itemId);
            }

            // ✅ CRIAR sprite travado na posição do molde
            const moldWorldX = mold.container.x;
            const moldWorldY = mold.container.y;

            // Converter posição do molde para porcentagem
            const bounds = this.scene.getBackgroundBounds();
            const lockedPosition = this.scene.worldToPercent(moldWorldX, moldWorldY, bounds);

            // Pegar dados completos do item do inventário ou database
            let itemData = null;
            if (gameStateManager.state.inventory && gameStateManager.state.inventory[itemId]) {
                itemData = gameStateManager.state.inventory[itemId];
            } else if (typeof databaseLoader !== 'undefined' && databaseLoader.getItemDefinition) {
                itemData = databaseLoader.getItemDefinition(itemId);
            }

            if (!itemData) {
                itemData = { id: itemId, name: itemId };
            }

            // Salvar item como travado no estado do jogo
            if (!gameStateManager.state.placedPuzzleItems) {
                gameStateManager.state.placedPuzzleItems = {};
            }
            gameStateManager.state.placedPuzzleItems[itemId] = {
                id: itemId,
                locationId: this.scene.currentLocation,
                position: lockedPosition,
                name: itemData.name || itemId,
                image: itemData.image,
                size: itemData.size || { width: 80, height: 80 },
                transform: itemData.transform,
                renderMode: itemData.renderMode
            };

            // ✅ Verificar se já existe sprite na cena (arrastado da cena) ou criar novo (arrastado do inventário)
            let droppedEntry = this.scene.droppedItemSprites?.find(s => s.data?.id === itemId);

            if (droppedEntry && droppedEntry.sprite) {
                // Item já estava na cena - mover para o molde
                this.scene.tweens.add({
                    targets: droppedEntry.sprite,
                    x: moldWorldX,
                    y: moldWorldY,
                    duration: 300,
                    ease: 'Back.easeOut'
                });

                if (droppedEntry.label) {
                    this.scene.tweens.add({
                        targets: droppedEntry.label,
                        x: moldWorldX,
                        y: moldWorldY + (droppedEntry.size?.height || 80) / 2 + 8,
                        duration: 300,
                        ease: 'Back.easeOut'
                    });
                }

                // Travar sprite
                droppedEntry.locked = true;
                if (droppedEntry.label) {
                    droppedEntry.label.setColor('#00ff00');
                }
            } else {
                // Item veio do inventário - criar sprite travado direto no molde
                this.scene.createDroppedItemSprite(itemData, moldWorldX, moldWorldY, true);
            }

            gameStateManager.saveProgress();
            gameStateManager.trigger('inventoryChanged');
        }

        this.checkSolution();
    }

    rejectItem(draggedObject) {
        this.scene.tweens.add({
            targets: draggedObject,
            x: draggedObject.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 3
        });
    }

    checkSolution() {
        const allFilled = this.molds.every(mold => mold.filled);
        if (allFilled && !this.solved) {
            this.onSolved();
        }
    }

    onSolved() {
        this.solved = true;

        // Animação de tremer nos moldes
        this.molds.forEach((mold, index) => {
            this.scene.tweens.add({
                targets: mold.container,
                x: mold.container.x + 3,
                duration: 50,
                yoyo: true,
                repeat: 5,
                delay: index * 100
            });

            if (mold.filledGraphics) {
                this.scene.tweens.add({
                    targets: mold.filledGraphics,
                    alpha: { from: 1, to: 0.6 },
                    duration: 200,
                    yoyo: true,
                    repeat: 2,
                    delay: index * 100
                });
            }
        });

        if (this.config.onSolved) {
            setTimeout(() => {
                this.config.onSolved();
            }, 1000);
        }
    }

    destroy() {
        this.molds.forEach(mold => {
            if (mold.container) {
                mold.container.destroy();
            }
        });
        this.molds = [];
    }
}
