/**
 * LocationScene
 * Cena principal onde o jogo acontece
 * Cada local é renderizado aqui dinamicamente
 */
class LocationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LocationScene' });
        this.currentLocation = null;
        this.locationData = null;
        this.hotspots = [];
        this.items = [];
        this.puzzleSprite = null;
        this.puzzleHitArea = null;
        this.currentPuzzleData = null;
        this.droppedItemSprites = [];
    }

    init(data) {
        // Recebe locationId de outras cenas
        if (data && data.locationId) {
            this.currentLocation = data.locationId;
        }
    }

    create() {
        // Obter dados da location
        this.locationData = databaseLoader.getLocation(this.currentLocation);

        if (!this.locationData) {
            console.error('Location not found:', this.currentLocation);
            return;
        }

        uiManager.setActiveScene(this);
        this.droppedItemSprites = [];
        // Renderizar background
        this.renderBackground();

        // Renderizar enigma (se existir) antes de itens/hotspots
        this.renderPuzzle();

        // Renderizar hotspots
        this.renderHotspots();

        // Renderizar itens
        this.renderItems();
        this.renderDroppedItems();
        this.highlightPendingPuzzleReward();

        // Atualizar UI
        uiManager.updateLocationInfo(this.locationData);

        // Fade in
        this.cameras.main.fadeIn(300, 0, 0, 0);

        // Listener para redimensionamento (Scale.RESIZE muda dimensões do game)
        this.scale.on('resize', this.handleResize, this);
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        // Reposicionar/reescalar background
        if (this.background) {
            this.background.setPosition(width / 2, height / 2);
            const scaleX = width / this.background.texture.source[0].width;
            const scaleY = height / this.background.texture.source[0].height;
            const scale = Math.min(scaleX, scaleY);
            this.background.setScale(scale);
        }

        // Recalcular posições de hotspots e itens
        this.repositionAll(width, height);
    }

    repositionAll(width, height) {
        // Limpar e recriar hotspots e itens
        this.hotspots.forEach(h => {
            h.zone.destroy();
            h.label.destroy();
        });
        this.items.forEach(i => {
            if (i.sprite) i.sprite.destroy();
        });

        this.hotspots = [];
        this.items = [];
        this.puzzleHitArea = null;
        this.clearDroppedSprites();

        if (this.puzzleSprite) {
            this.puzzleSprite.destroy();
            this.puzzleSprite = null;
        }

        this.renderPuzzle();

        this.renderHotspots();
        this.renderItems();
        this.renderDroppedItems();
    }

    // Helper: calcula dimensões e posição do background
    getBackgroundBounds() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Handle "fake" background object when image is missing
        if (!this.background || !this.background.texture) {
            return {
                width: width,
                height: height,
                bgWidth: width,
                bgHeight: height,
                bgX: 0,
                bgY: 0
            };
        }

        const bg = this.background;
        const bgWidth = bg.displayWidth;
        const bgHeight = bg.displayHeight;
        const bgX = bg.x - (bgWidth / 2);
        const bgY = bg.y - (bgHeight / 2);

        return { width, height, bgWidth, bgHeight, bgX, bgY };
    }

    renderBackground() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Verificar se a textura foi carregada
        const hasTexture = this.textures.exists(this.currentLocation);

        if (hasTexture) {
            // Adicionar imagem de fundo
            const bg = this.add.image(width / 2, height / 2, this.currentLocation);

            // Ajustar escala para preencher tela (contain)
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.min(scaleX, scaleY);
            bg.setScale(scale);

            // Salvar referência
            this.background = bg;
        } else {
            // Fallback: criar retângulo colorido se imagem não carregou
            console.warn('⚠️ Imagem não encontrada para:', this.currentLocation);

            const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x2a2a2a);

            // Adicionar texto indicando que a imagem está faltando
            const errorText = this.add.text(width / 2, height / 2,
                `❌ Imagem não encontrada\n\n${this.locationData.name}\n\nID: ${this.currentLocation}\nPath esperado: ${this.locationData.image}`, {
                fontSize: '24px',
                color: '#f0a500',
                align: 'center',
                backgroundColor: '#000000',
                padding: { x: 20, y: 20 }
            });
            errorText.setOrigin(0.5);

            // Criar objeto "fake" que funciona como imagem
            this.background = {
                width: width,
                height: height,
                scale: 1,
                x: width / 2,
                y: height / 2,
                texture: null, // Add texture property to avoid errors
                setOrigin: () => { }, // Add a dummy setOrigin method
                setPosition: (x, y) => {
                    this.background.x = x;
                    this.background.y = y;
                },
                setScale: (scale) => {
                    this.background.scale = scale;
                }
            };
        }
    }

    renderPuzzle() {
        if (this.puzzleSprite) {
            this.puzzleSprite.destroy();
            this.puzzleSprite = null;
        }
        this.puzzleHitArea = null;
        this.currentPuzzleData = this.locationData.puzzle || null;

        const puzzle = this.locationData.puzzle;
        if (!puzzle || !puzzle.visual) {
            return;
        }

        const visual = puzzle.visual;
        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        const width = visual.size?.width || 120;
        const height = visual.size?.height || 120;

        const x = bgX + (visual.position.x / 100) * bgWidth;
        const y = bgY + (visual.position.y / 100) * bgHeight;

        const isSolved = gameStateManager.isPuzzleSolved(puzzle.id);
        let textureKey = null;

        if (isSolved && visual.afterImage) {
            textureKey = `puzzle_${this.locationData.id}_after`;
        } else if (!isSolved && visual.beforeImage) {
            textureKey = `puzzle_${this.locationData.id}_before`;
        }

        if (textureKey && this.textures.exists(textureKey)) {
            this.puzzleSprite = this.add.image(x, y, textureKey);
            this.puzzleSprite.setDisplaySize(width, height);
        } else {
            this.puzzleSprite = this.add.rectangle(x, y, width, height, 0x8b4513, 0.65);
            this.puzzleSprite.setStrokeStyle(2, 0xf0a500);
        }

        this.applyPuzzleTransforms(this.puzzleSprite, visual.transform);
        this.puzzleSprite.setDepth(80);

        const displayWidth = this.puzzleSprite.displayWidth || width;
        const displayHeight = this.puzzleSprite.displayHeight || height;

        this.puzzleHitArea = {
            x: this.puzzleSprite.x - displayWidth / 2,
            y: this.puzzleSprite.y - displayHeight / 2,
            width: displayWidth,
            height: displayHeight
        };
    }

    applyPuzzleTransforms(sprite, transform = {}) {
        if (!sprite) return;
        sprite.setAngle(transform.rotation || 0);
        const scaleX = (transform.scaleX || 1) * (transform.flipX ? -1 : 1);
        const scaleY = (transform.scaleY || 1) * (transform.flipY ? -1 : 1);
        sprite.setScale(scaleX, scaleY);
        if (typeof transform.opacity === 'number') {
            sprite.setAlpha(transform.opacity);
        } else {
            sprite.setAlpha(1);
        }
    }

    flashPuzzleSprite(color = 0xf0a500) {
        if (!this.puzzleSprite) return;
        this.puzzleSprite.setTint(color);
        this.time.delayedCall(200, () => {
            if (this.puzzleSprite) {
                this.puzzleSprite.clearTint();
            }
        });
    }

    isPointInsidePuzzle(px, py) {
        if (!this.puzzleHitArea) return false;
        const { x, y, width, height } = this.puzzleHitArea;
        return px >= x && px <= x + width && py >= y && py <= y + height;
    }

    clearDroppedSprites() {
        if (!this.droppedItemSprites) {
            this.droppedItemSprites = [];
            return;
        }
        this.droppedItemSprites.forEach(entry => {
            entry.sprite?.destroy();
            entry.label?.destroy();
        });
        this.droppedItemSprites = [];
    }

    renderDroppedItems() {
        this.clearDroppedSprites();
        const droppedItems = gameStateManager.getDroppedItems(this.currentLocation);
        if (!droppedItems || droppedItems.length === 0) {
            return;
        }
        const bounds = this.getBackgroundBounds();
        droppedItems.forEach(item => {
            if (!item.dropPosition) return;
            const world = this.percentToWorld(item.dropPosition, bounds);
            this.createDroppedItemSprite(item, world.x, world.y);
        });
    }

    calculateRewardDropPlacement(puzzle, reward) {
        const bounds = this.getBackgroundBounds();
        const clampPercent = (value) => Math.min(98, Math.max(2, value));
        const rewardSize = reward?.size || { width: 80, height: 80 };

        const pickPercent = (source) => {
            if (!source) return null;
            const { x, y } = source;
            if (typeof x === 'number' && typeof y === 'number' && !Number.isNaN(x) && !Number.isNaN(y)) {
                return { x, y };
            }
            return null;
        };

        let percent = pickPercent(reward?.dropPosition) ||
            pickPercent(reward?.position) ||
            pickPercent(puzzle?.rewardPosition) ||
            pickPercent(puzzle?.visual?.rewardPosition) ||
            null;

        if (!percent) {
            if (this.puzzleSprite) {
                const spriteBounds = this.puzzleSprite.getBounds ? this.puzzleSprite.getBounds() : null;
                const worldX = spriteBounds ? spriteBounds.centerX : this.puzzleSprite.x;
                const spriteBottom = spriteBounds ? spriteBounds.bottom : (this.puzzleSprite.y + (this.puzzleSprite.displayHeight || 0) / 2);
                const dropWorldY = spriteBottom + (rewardSize.height / 2) + 12;
                percent = this.worldToPercent(worldX, dropWorldY, bounds);
            } else if (puzzle?.visual?.position) {
                percent = {
                    x: puzzle.visual.position.x,
                    y: puzzle.visual.position.y + 12
                };
            } else {
                percent = { x: 50, y: 60 };
            }
        }

        const applyOffset = (offset) => {
            if (!offset) return;
            if (typeof offset.x === 'number' && !Number.isNaN(offset.x)) {
                percent.x += offset.x;
            }
            if (typeof offset.y === 'number' && !Number.isNaN(offset.y)) {
                percent.y += offset.y;
            }
        };

        applyOffset(reward?.dropOffset);
        applyOffset(puzzle?.rewardOffset);
        applyOffset(puzzle?.visual?.rewardOffset);

        percent.x = clampPercent(percent.x);
        percent.y = clampPercent(percent.y);

        return percent;
    }

    createDroppedItemSprite(item, worldX, worldY) {
        const size = item.dropSize || item.size || { width: 80, height: 80 };
        let transform = item.dropTransform || item.transform || null;
        let renderMode = item.renderMode || (transform ? 'dom' : 'sprite');
        let imagePath = item.image;

        let definition = null;
        if (typeof databaseLoader !== 'undefined' && typeof databaseLoader.getItemDefinition === 'function') {
            definition = databaseLoader.getItemDefinition(item.id);
        }

        if ((!transform || (typeof transform === 'object' && Object.keys(transform).length === 0)) && definition && definition.transform) {
            transform = JSON.parse(JSON.stringify(definition.transform));
            if (!item.renderMode) {
                renderMode = 'dom';
            }
        }

        if (!imagePath && definition && definition.image) {
            imagePath = definition.image;
        }

        const useDom = renderMode === 'dom' || (transform && (transform.rotateX || transform.rotateY || transform.skewX || transform.skewY));

        let sprite;

        if (useDom) {
            const img = document.createElement('img');
            const imgSrc = imagePath || `images/items/${item.id}.png`;
            img.src = imgSrc;
            img.alt = item.name || item.id;
            img.style.width = `${size.width}px`;
            img.style.height = `${size.height}px`;
            img.style.pointerEvents = 'auto';

            sprite = this.add.dom(worldX, worldY, img);
            sprite.setOrigin(0.5);
            sprite.addListener('pointerdown');
            sprite.on('pointerdown', () => this.pickupDroppedItem(item.id));
            sprite.setDepth(90);

            const perspective = transform?.perspective || 800;
            sprite.setPerspective(perspective);

            const rotX = transform?.rotateX || 0;
            const rotY = transform?.rotateY || 0;
            if (rotX !== 0 && rotY !== 0) {
                sprite.rotate3d.set(1, 0, 0, rotX);
            } else if (rotX !== 0) {
                sprite.rotate3d.set(1, 0, 0, rotX);
            } else if (rotY !== 0) {
                sprite.rotate3d.set(0, 1, 0, rotY);
            }

            if (transform && typeof transform === 'object' && Object.keys(transform).length > 0) {
                const transforms = [];
                const rotation = transform.rotation || 0;
                if (rotation !== 0) {
                    transforms.push(`rotate(${rotation}deg)`);
                }

                const baseScaleX = transform.scaleX ?? 1;
                const baseScaleY = transform.scaleY ?? 1;
                const flipX = transform.flipX ? -1 : 1;
                const flipY = transform.flipY ? -1 : 1;
                const finalScaleX = baseScaleX * flipX;
                const finalScaleY = baseScaleY * flipY;
                transforms.push(`scale(${finalScaleX}, ${finalScaleY})`);

                const skewX = transform.skewX || 0;
                const skewY = transform.skewY || 0;
                if (skewX !== 0) transforms.push(`skewX(${skewX}deg)`);
                if (skewY !== 0) transforms.push(`skewY(${skewY}deg)`);

                img.style.transform = transforms.join(' ') || 'none';

                if (baseScaleX !== 1 || baseScaleY !== 1 || flipX === -1 || flipY === -1) {
                    sprite.setScale(finalScaleX, finalScaleY);
                }

                if (typeof transform.opacity === 'number') {
                    sprite.setAlpha(transform.opacity);
                } else {
                    sprite.setAlpha(1);
                }

                const shadowBlur = transform.shadowBlur || 0;
                const shadowX = transform.shadowOffsetX || 0;
                const shadowY = transform.shadowOffsetY || 0;
                if (shadowBlur > 0) {
                    img.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.5))`;
                } else {
                    img.style.filter = '';
                }
            } else {
                sprite.setAlpha(1);
                img.style.transform = 'none';
                img.style.filter = '';
            }
        } else {
            const textureKey = item.textureKey || `item_${item.id}`;
            if (this.textures.exists(textureKey)) {
                sprite = this.add.image(worldX, worldY, textureKey);
                sprite.setDisplaySize(size.width, size.height);
                sprite.setInteractive({ useHandCursor: true });
                sprite.on('pointerdown', () => this.pickupDroppedItem(item.id));
            } else if (imagePath) {
                const img = document.createElement('img');
                img.src = imagePath;
                img.style.width = `${size.width}px`;
                img.style.height = `${size.height}px`;
                img.style.pointerEvents = 'auto';

                sprite = this.add.dom(worldX, worldY, img);
                sprite.setOrigin(0.5);
                sprite.addListener('pointerdown');
                sprite.on('pointerdown', () => this.pickupDroppedItem(item.id));
            } else {
                sprite = this.add.text(worldX, worldY, '📦', {
                    fontSize: '28px'
                });
                sprite.setInteractive({ useHandCursor: true });
                sprite.on('pointerdown', () => this.pickupDroppedItem(item.id));
            }

            sprite.setOrigin?.(0.5);
            sprite.setDepth(90);

            if (transform) {
                const rotation = transform.rotation || 0;
                sprite.setAngle?.(rotation);
                if (transform.flipX) sprite.setFlipX?.(true);
                if (transform.flipY) sprite.setFlipY?.(true);
                if (typeof transform.opacity === 'number' && sprite.setAlpha) {
                    sprite.setAlpha(transform.opacity);
                }
                if (sprite.setScale && (transform.scaleX !== undefined || transform.scaleY !== undefined)) {
                    const scaleX = transform.scaleX ?? 1;
                    const scaleY = transform.scaleY ?? 1;
                    sprite.setScale(scaleX, scaleY);
                }
            }
        }

        if (!sprite) return;

        sprite.setDepth?.(90);

        const label = this.add.text(worldX, worldY + size.height / 2 + 8, item.name || item.id, {
            fontSize: '12px',
            color: '#f0a500',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 6, y: 3 }
        });
        label.setOrigin(0.5, 0);
        label.setDepth(90);

        const spriteAlpha = typeof sprite.alpha === 'number' ? sprite.alpha : 1;
        const labelAlpha = typeof label.alpha === 'number' ? label.alpha : 1;
        this.droppedItemSprites.push({
            id: item.id,
            sprite,
            label,
            alpha: spriteAlpha,
            labelAlpha
        });
    }

    highlightDroppedItem(itemId, attempt = 0) {
        if (!this.droppedItemSprites || this.droppedItemSprites.length === 0) {
            if (attempt < 5) {
                this.time.delayedCall(80, () => this.highlightDroppedItem(itemId, attempt + 1));
            }
            return;
        }

        const entry = this.droppedItemSprites.find(data => data.id === itemId);
        if (!entry) {
            if (attempt < 5) {
                this.time.delayedCall(80, () => this.highlightDroppedItem(itemId, attempt + 1));
            }
            return;
        }

        const { sprite, label, alpha, labelAlpha } = entry;
        if (!sprite) return;

        const finalAlpha = typeof alpha === 'number' ? alpha : (typeof sprite.alpha === 'number' ? sprite.alpha : 1);
        const originalY = sprite.y;

        sprite.setAlpha(0);
        sprite.setY(originalY - 40);

        this.tweens.add({
            targets: sprite,
            alpha: finalAlpha,
            y: originalY,
            duration: 500,
            ease: 'Back.easeOut'
        });

        if (label) {
            const finalLabelAlpha = typeof labelAlpha === 'number' ? labelAlpha : (typeof label.alpha === 'number' ? label.alpha : 1);
            const labelOriginalY = label.y;
            label.setAlpha(0);
            label.setY(labelOriginalY - 20);
            this.tweens.add({
                targets: label,
                alpha: finalLabelAlpha,
                y: labelOriginalY,
                duration: 450,
                ease: 'Cubic.easeOut',
                delay: 120
            });
        }
    }

    highlightPendingPuzzleReward() {
        const puzzle = this.locationData.puzzle;
        if (!puzzle || !puzzle.reward) return;
        const rewardItem = gameStateManager.getInventoryItem(puzzle.reward.id);
        if (rewardItem && rewardItem.status === 'dropped' && rewardItem.dropLocation === this.currentLocation) {
            this.time.delayedCall(120, () => this.highlightDroppedItem(puzzle.reward.id));
        }
    }

    pickupDroppedItem(itemId) {
        const item = gameStateManager.pickupDroppedItem(itemId);
        if (!item) {
            return;
        }
        this.renderDroppedItems();
        uiManager.renderInventory();
        uiManager.showNotification(`Você pegou: ${item.name || itemId}`);
    }

    worldToPercent(worldX, worldY, bounds = this.getBackgroundBounds()) {
        const clamp = (value) => Math.min(100, Math.max(0, value));
        const x = clamp(((worldX - bounds.bgX) / bounds.bgWidth) * 100);
        const y = clamp(((worldY - bounds.bgY) / bounds.bgHeight) * 100);
        return { x, y };
    }

    percentToWorld(position, bounds = this.getBackgroundBounds()) {
        const worldX = bounds.bgX + (position.x / 100) * bounds.bgWidth;
        const worldY = bounds.bgY + (position.y / 100) * bounds.bgHeight;
        return { x: worldX, y: worldY };
    }

    isPointInsideBackground(worldX, worldY, bounds = this.getBackgroundBounds()) {
        return (
            worldX >= bounds.bgX &&
            worldX <= bounds.bgX + bounds.bgWidth &&
            worldY >= bounds.bgY &&
            worldY <= bounds.bgY + bounds.bgHeight
        );
    }

    renderHotspots() {
        if (!this.locationData.hotspots) return;

        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        this.locationData.hotspots.forEach(hotspot => {
            if (!hotspot.position) {
                console.warn('Hotspot sem dados de posição:', hotspot);
                return; // Pula este hotspot se não tiver posição
            }

            const x = bgX + (hotspot.position.x / 100) * bgWidth;
            const y = bgY + (hotspot.position.y / 100) * bgHeight;
            const w = (hotspot.position.width / 100) * bgWidth;
            const h = (hotspot.position.height / 100) * bgHeight;

            // Criar área interativa (invisível)
            const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
            zone.setInteractive({ useHandCursor: true });
            zone.setOrigin(0.5);

            // Label (nome do destino)
            const label = this.add.text(x + w / 2, y + h + 10, hotspot.label, {
                fontSize: '18px',
                color: '#f0a500',
                backgroundColor: '#000000',
                padding: { x: 10, y: 6 },
                fontStyle: 'bold'
            });
            label.setOrigin(0.5, 0);
            label.setAlpha(0); // Invisível por padrão

            // Hover effects - apenas label
            zone.on('pointerover', () => {
                label.setAlpha(1);
                // Animação suave de fade in
                this.tweens.add({
                    targets: label,
                    alpha: 1,
                    y: label.y - 5,
                    duration: 200,
                    ease: 'Power2'
                });
            });

            zone.on('pointerout', () => {
                this.tweens.killTweensOf(label);
                label.setAlpha(0);
                label.setY(y + h + 10); // Reset posição
            });

            // Click handler
            zone.on('pointerdown', () => {
                this.handleHotspotClick(hotspot);
            });

            // Salvar referências
            this.hotspots.push({
                zone,
                label,
                data: hotspot
            });
        });
    }

    renderItems() {
        if (!this.locationData.items) return;

        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        this.locationData.items.forEach(item => {
            if (gameStateManager.isItemCollected(item.id)) return;
            if (!item.image || !item.position) {
                console.warn('Item sem dados de imagem ou posição:', item);
                return;
            }

            const x = bgX + (item.position.x / 100) * bgWidth;
            const y = bgY + (item.position.y / 100) * bgHeight;

            const transform = item.transform || {};
            let element;

            // Se tem qualquer transformação, usar DOMElement para ter mais controle
            if (item.transform) {
                // Criar elemento HTML <img>
                const img = document.createElement('img');
                img.src = item.image;
                img.style.width = (item.size?.width || 80) + 'px';
                img.style.height = (item.size?.height || 80) + 'px';
                img.style.pointerEvents = 'auto';

                // Criar DOMElement
                element = this.add.dom(x, y, img);
                element.setOrigin(0.5);

                // Aplicar perspectiva via Phaser
                element.setPerspective(800);

                // Aplicar rotações 3D via Phaser API (no container)
                const rotX = transform.rotateX || 0;
                const rotY = transform.rotateY || 0;

                if (rotX !== 0 && rotY !== 0) {
                    element.rotate3d.set(1, 0, 0, rotX);
                } else if (rotX !== 0) {
                    element.rotate3d.set(1, 0, 0, rotX);
                } else if (rotY !== 0) {
                    element.rotate3d.set(0, 1, 0, rotY);
                }

                // Construir transformações 2D via CSS (na imagem, não no container!)
                const transforms = [];

                // Rotação 2D (Z axis)
                const rotation = transform.rotation || 0;
                if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);

                // Escala (com flip integrado) - PRIORIDADE!
                const baseScaleX = transform.scaleX || 1;
                const baseScaleY = transform.scaleY || 1;
                const flipX = transform.flipX ? -1 : 1;
                const flipY = transform.flipY ? -1 : 1;
                const finalScaleX = baseScaleX * flipX;
                const finalScaleY = baseScaleY * flipY;
                transforms.push(`scale(${finalScaleX}, ${finalScaleY})`);

                // Skew (distorção) - pode ver depois
                const skewX = transform.skewX || 0;
                const skewY = transform.skewY || 0;
                if (skewX !== 0) transforms.push(`skewX(${skewX}deg)`);
                if (skewY !== 0) transforms.push(`skewY(${skewY}deg)`);

                // Aplicar na IMAGEM (não no container com rotate3d)
                const transformString = transforms.join(' ');
                img.style.transform = transformString;

                // Aplicar scale TAMBÉM via Phaser (além do CSS)
                if (baseScaleX !== 1 || baseScaleY !== 1) {
                    element.setScale(finalScaleX, finalScaleY);
                }

                // DEBUG
                console.log('🎨 Item:', item.id);
                console.log('  Transform object:', transform);
                console.log('  Scale values:', {baseScaleX, baseScaleY, flipX, flipY, finalScaleX, finalScaleY});
                console.log('  CSS 2D transforms:', transformString);
                console.log('  Applied to img:', img.style.transform);
                console.log('  Phaser scale:', element.scaleX, element.scaleY);

                // Aplicar opacidade via Phaser setAlpha (ROLLBACK)
                if (transform.opacity !== undefined) {
                    element.setAlpha(transform.opacity);
                }

                // Aplicar sombra via CSS filter (drop-shadow)
                const shadowBlur = transform.shadowBlur || 0;
                const shadowX = transform.shadowOffsetX || 0;
                const shadowY = transform.shadowOffsetY || 0;
                if (shadowBlur > 0) {
                    img.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.5))`;
                } else {
                    img.style.filter = 'none';
                }

                // Salvar transform original para hover
                const originalTransform = img.style.transform;

                // Eventos de hover/click via DOMElement
                element.addListener('pointerover');
                element.on('pointerover', () => {
                    img.style.filter = 'brightness(1.2)';
                    img.style.transition = 'filter 0.2s ease';
                });

                element.addListener('pointerout');
                element.on('pointerout', () => {
                    img.style.filter = '';
                });

                element.addListener('pointerdown');
                element.on('pointerdown', () => {
                    this.collectItem(item, element);
                });

            } else {
                // Sem rotação 3D - usar Phaser Image normal
                const textureKey = 'item_' + item.id;
                const hasTexture = this.textures.exists(textureKey);

                if (hasTexture) {
                    element = this.add.image(x, y, textureKey);

                    // Set size
                    if (item.size) {
                        element.setDisplaySize(item.size.width, item.size.height);
                    } else {
                        element.setDisplaySize(80, 80);
                    }

                    // Apply transformations
                    element.setAngle(transform.rotation || 0);
                    if (transform.flipX) element.flipX = true;
                    if (transform.flipY) element.flipY = true;
                    if (transform.opacity !== undefined) {
                        element.setAlpha(transform.opacity);
                    }
                    element.setOrigin(0.5);

                    // Make it interactive
                    element.setInteractive({ useHandCursor: true });

                    // Store original scale
                    const originalScaleX = element.scaleX;
                    const originalScaleY = element.scaleY;

                    // Hover effect
                    element.on('pointerover', () => {
                        this.tweens.add({
                            targets: element,
                            scaleX: originalScaleX * 1.15,
                            scaleY: originalScaleY * 1.15,
                            duration: 200,
                            ease: 'Power2'
                        });
                    });

                    element.on('pointerout', () => {
                        this.tweens.killTweensOf(element);
                        element.setScale(originalScaleX, originalScaleY);
                    });

                    // Click handler
                    element.on('pointerdown', () => {
                        this.collectItem(item, element);
                    });
                } else {
                    // Fallback: create rectangle with emoji
                    console.warn('⚠️ Item image not found:', item.id, item.image);
                    element = this.add.text(x, y, '📦', {
                        fontSize: '48px'
                    });
                    element.setOrigin(0.5);
                }
            }

            this.items.push({ sprite: element, data: item });
        });
    }

    handleHotspotClick(hotspot) {
        console.log('🖱️ Clique no hotspot:', hotspot);

        switch (hotspot.action) {
            case 'navigate':
            case 'navigation':
                // Aceitar ambos target e targetLocation para compatibilidade
                const targetId = hotspot.targetLocation || hotspot.target;
                console.log('➡️ Navegando para:', targetId);
                this.navigateToLocation(targetId, hotspot);
                break;

            case 'puzzle':
                this.promptPuzzleInteraction(hotspot.puzzleId || (this.locationData.puzzle?.id));
                break;

            case 'collect':
                const item = this.locationData.items?.find(i => i.id === hotspot.itemId);
                if (item) {
                    this.collectItem(item);
                }
                break;

            case 'interact':
                uiManager.showNotification('Nada de interessante aqui...');
                break;
        }
    }

    promptPuzzleInteraction(puzzleId) {
        const puzzle = this.locationData.puzzle;
        if (!puzzle || (puzzleId && puzzle.id !== puzzleId)) {
            uiManager.showNotification('Nada acontece aqui...');
            return;
        }

        if (gameStateManager.isPuzzleSolved(puzzle.id)) {
            uiManager.showNotification('Este enigma já foi resolvido.');
            return;
        }

        uiManager.showNotification('Arraste o item correto do inventário até o enigma.');
        this.flashPuzzleSprite();
    }

    handleInventoryDrop(itemId, pointer) {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const baseWidth = this.scale.gameSize.width;
        const baseHeight = this.scale.gameSize.height;
        const localX = ((pointer.x - rect.left) / rect.width) * baseWidth;
        const localY = ((pointer.y - rect.top) / rect.height) * baseHeight;

        const worldPoint = this.cameras.main.getWorldPoint(localX, localY);
        const bounds = this.getBackgroundBounds();
        console.log('[DROP]', {
            itemId,
            pointer,
            localX,
            localY,
            worldX: worldPoint.x,
            worldY: worldPoint.y,
            bounds
        });
        if (!this.isPointInsideBackground(worldPoint.x, worldPoint.y, bounds)) {
            uiManager.showNotification('Solte o item sobre a cena.', 2500);
            return;
        }

        const percentPosition = this.worldToPercent(worldPoint.x, worldPoint.y, bounds);
        const puzzle = this.locationData.puzzle;
        const insidePuzzle = puzzle && this.isPointInsidePuzzle(worldPoint.x, worldPoint.y);

        if (insidePuzzle && puzzle?.type === 'item_combination') {
            this.handleItemCombinationPuzzle(puzzle, itemId, worldPoint, percentPosition);
        } else if (insidePuzzle && puzzle) {
            uiManager.showNotification('Este enigma não aceita itens diretamente.', 2500);
            this.flashPuzzleSprite(0xff6666);
        } else {
            this.placeItemInScene(itemId, worldPoint, percentPosition);
        }

        console.log('[INVENTORY STATE AFTER DROP]', JSON.parse(JSON.stringify(gameStateManager.state.inventory)));
    }

    placeItemInScene(itemId, worldPoint, percentPosition) {
        const inventoryItem = gameStateManager.getInventoryItem(itemId);
        if (!inventoryItem || inventoryItem.status !== 'held') {
            uiManager.showNotification('Este item não está no seu inventário.');
            return;
        }

        const size = inventoryItem.size || { width: 80, height: 80 };
        const dropInfo = gameStateManager.dropInventoryItem(itemId, this.currentLocation, percentPosition, {
            size,
            inPuzzleArea: false
        });

        if (!dropInfo) {
            uiManager.showNotification('Não foi possível posicionar este item.', 2500);
            return;
        }

        console.log('[DROP] Item colocado na cena:', dropInfo);
        this.renderDroppedItems();
        uiManager.renderInventory();
        uiManager.showNotification(`${dropInfo.name || itemId} foi colocado no cenário.`);
    }

    handleItemCombinationPuzzle(puzzle, itemId, worldPoint, percentPosition) {
        if (gameStateManager.isPuzzleSolved(puzzle.id)) {
            uiManager.showNotification('O enigma já foi resolvido.');
            return;
        }

        const inventoryItem = gameStateManager.getInventoryItem(itemId);
        if (!inventoryItem || inventoryItem.status === 'used') {
            uiManager.showNotification('Este item não pode ser usado.', 2500);
            this.flashPuzzleSprite(0xff6666);
            return;
        }

        const size = inventoryItem.size || { width: 80, height: 80 };
        const dropInfo = gameStateManager.dropInventoryItem(itemId, this.currentLocation, percentPosition, {
            size,
            inPuzzleArea: true
        });

        if (!dropInfo) {
            uiManager.showNotification('Não foi possível posicionar este item.', 2500);
            return;
        }

        console.log('[DROP] Item posicionado no enigma:', dropInfo);
        this.renderDroppedItems();
        uiManager.renderInventory();

        const required = (puzzle.requiredItems || []).map(id => id.trim()).filter(Boolean);
        if (required.length === 0) {
            this.solveCurrentPuzzle(puzzle, [itemId]);
            return;
        }

        if (!required.includes(itemId)) {
            uiManager.showNotification('Este item não parece encaixar aqui.', 2500);
            this.flashPuzzleSprite(0xff6666);
            return;
        }

        const missing = required.filter(id => !gameStateManager.isItemPlacedAtLocation(id, this.currentLocation, true));
        if (missing.length > 0) {
            uiManager.showNotification(`Falta posicionar: ${missing.join(', ')}`, 2500);
            this.flashPuzzleSprite(0xffc107);
            return;
        }

        this.solveCurrentPuzzle(puzzle, required);
    }

    solveCurrentPuzzle(puzzle, consumedItems = []) {
        if (!puzzle) return;
        const reward = puzzle.reward ? JSON.parse(JSON.stringify(puzzle.reward)) : null;
        if (reward && !reward.image) {
            reward.image = `images/items/${reward.id}.png`;
        }

        let dropPosition = null;
        if (reward) {
            dropPosition = this.calculateRewardDropPlacement(puzzle, reward);
        }

        const solved = gameStateManager.solvePuzzle(puzzle.id, reward, this.currentLocation, {
            dropPosition,
            dropSize: reward?.size,
            dropTransform: reward?.dropTransform || reward?.transform,
            renderMode: reward?.renderMode,
            baseTransform: reward?.transform
        });
        if (!solved) {
            uiManager.showNotification('Este enigma já foi resolvido.');
            return;
        }

        if (consumedItems && consumedItems.length) {
            const unique = Array.from(new Set(consumedItems));
            unique.forEach(id => gameStateManager.consumeItem(id));
        }

        this.flashPuzzleSprite(0x6fff9b);
        this.updatePuzzleVisual(true);
        this.renderDroppedItems();

        if (reward) {
            const messageName = reward.name || 'Recompensa';
            uiManager.showNotification(`✓ Enigma resolvido! ${messageName} apareceu na cena.`);
            this.highlightDroppedItem(reward.id);
        } else {
            uiManager.showNotification('✓ Enigma resolvido!');
        }

        uiManager.renderInventory();
    }

    updatePuzzleVisual(isSolved) {
        if (!this.puzzleSprite || !this.locationData.puzzle) return;
        const visual = this.locationData.puzzle.visual;
        let textureKey = null;

        if (isSolved && visual.afterImage) {
            textureKey = `puzzle_${this.locationData.id}_after`;
        } else if (!isSolved && visual.beforeImage) {
            textureKey = `puzzle_${this.locationData.id}_before`;
        }

        if (textureKey && this.textures.exists(textureKey)) {
            this.puzzleSprite.setTexture(textureKey);
            this.puzzleSprite.setDisplaySize(visual.size?.width || this.puzzleSprite.displayWidth, visual.size?.height || this.puzzleSprite.displayHeight);
        }

        this.applyPuzzleTransforms(this.puzzleSprite, visual.transform);

        const displayWidth = this.puzzleSprite.displayWidth;
        const displayHeight = this.puzzleSprite.displayHeight;
        this.puzzleHitArea = {
            x: this.puzzleSprite.x - displayWidth / 2,
            y: this.puzzleSprite.y - displayHeight / 2,
            width: displayWidth,
            height: displayHeight
        };
    }

    navigateToLocation(targetLocationId, hotspot) {
        console.log('🚀 navigateToLocation chamada:', targetLocationId);

        if (!targetLocationId) {
            console.error('❌ targetLocationId está vazio ou undefined!');
            return;
        }

        // Verificar se o destino existe
        const targetExists = databaseLoader.getLocation(targetLocationId);
        if (!targetExists) {
            console.error('❌ Localização de destino não encontrada:', targetLocationId);
            uiManager.showNotification('Localização não encontrada: ' + targetLocationId);
            return;
        }

        console.log('✅ Destino encontrado:', targetExists.name);

        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        const centerX = bgX + ((hotspot.position.x + hotspot.position.width / 2) / 100) * bgWidth;
        const centerY = bgY + ((hotspot.position.y + hotspot.position.height / 2) / 100) * bgHeight;

        // Determinar tipo de zoom baseado no hotspot
        const zoomDirection = hotspot.zoomDirection || 'in'; // Default: zoom in
        let zoomLevel = 1;

        if (zoomDirection === 'in') {
            zoomLevel = 2.5; // Zoom in (aproximar)
        } else if (zoomDirection === 'out') {
            zoomLevel = 0.5; // Zoom out (afastar)
        } else {
            zoomLevel = 1; // Sem zoom
        }

        console.log('🎬 Iniciando animação de zoom...');

        // Animação de pan e zoom
        this.cameras.main.pan(centerX, centerY, 700, 'Cubic.easeInOut');
        this.cameras.main.zoomTo(zoomLevel, 700, 'Cubic.easeInOut');

        // Fade out e trocar cena
        this.time.delayedCall(500, () => {
            console.log('🎬 Fade out iniciado...');
            this.cameras.main.fadeOut(200, 0, 0, 0);
        });

        this.cameras.main.once('camerafadeoutcomplete', () => {
            console.log('🎬 Fade out completo! Trocando para:', targetLocationId);

            // Atualizar estado
            gameStateManager.navigateToLocation(targetLocationId);

            // Reiniciar cena com nova location
            console.log('🔄 Reiniciando cena...');
            this.scene.restart({ locationId: targetLocationId });
        });
    }

    collectItem(item, element) {
        const collected = gameStateManager.collectItem(item);

        if (collected) {
            uiManager.showNotification(`✓ Você pegou: ${item.name}`);
            uiManager.renderInventory();

            // Animação de coleta
            if (element) {
                this.tweens.add({
                    targets: element,
                    y: element.y - 100,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2',
                    onComplete: () => {
                        element.destroy();
                    }
                });
            }
        } else {
            uiManager.showNotification('Você já pegou este item');
        }
    }

    openPuzzle(puzzleId) {
        this.promptPuzzleInteraction(puzzleId);
    }

    shutdown() {
        // Cleanup
        this.hotspots = [];
        this.items = [];
        this.puzzleHitArea = null;
        if (this.puzzleSprite) {
            this.puzzleSprite.destroy();
            this.puzzleSprite = null;
        }
        this.currentPuzzleData = null;
        this.clearDroppedSprites();
        uiManager.setActiveScene(null);

        // Remover listener de resize
        this.scale.off('resize', this.handleResize, this);
    }
}
