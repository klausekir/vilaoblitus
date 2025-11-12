const DEBUG_SCENE_DRAG = true;
function debugSceneDrag(...args) {
    if (DEBUG_SCENE_DRAG) {
        console.log('[SCENE-DRAG]', ...args);
    }
}

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
        this.activeDroppedItemDrag = null;
        this.sceneItemDragThreshold = 8;
        this._boundSceneItemDragMove = (event) => this.handleSceneItemDragMove(event);
        this._boundSceneItemDragEnd = (event) => this.handleSceneItemDragEnd(event);
        this._sceneDragListenersAttached = false;
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
            console.log('[PUZZLE] renderPuzzle: sem puzzle visual', this.locationData.id);
            return;
        }

        const visual = puzzle.visual;
        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        const targetWidth = visual.size?.width || 120;
        const targetHeight = visual.size?.height || 120;

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

            const sourceWidth = this.puzzleSprite.width || targetWidth || 1;
            const sourceHeight = this.puzzleSprite.height || targetHeight || 1;
            const safeTargetWidth = Math.max(1, targetWidth);
            const safeTargetHeight = Math.max(1, targetHeight);
            const containScale = Math.min(safeTargetWidth / sourceWidth, safeTargetHeight / sourceHeight);
            const finalScale = Number.isFinite(containScale) && containScale > 0 ? containScale : 1;

            this.puzzleSprite.setScale(finalScale);
            this.puzzleSprite.displayWidth = sourceWidth * finalScale;
            this.puzzleSprite.displayHeight = sourceHeight * finalScale;
        } else {
            this.puzzleSprite = this.add.rectangle(x, y, targetWidth, targetHeight, 0x8b4513, 0.65);
            this.puzzleSprite.setStrokeStyle(2, 0xf0a500);
        }

        this.applyPuzzleTransforms(this.puzzleSprite, visual.transform);
        this.puzzleSprite.setDepth(80);

        const displayWidth = this.puzzleSprite.displayWidth || targetWidth;
        const displayHeight = this.puzzleSprite.displayHeight || targetHeight;

        this.puzzleHitArea = {
            x: this.puzzleSprite.x - displayWidth / 2,
            y: this.puzzleSprite.y - displayHeight / 2,
            width: displayWidth,
            height: displayHeight
        };

        if (puzzle.type && puzzle.type !== 'item_combination') {
            this.puzzleSprite.setInteractive({ useHandCursor: true });
            this.puzzleSprite.on('pointerdown', () => {
                console.log('[PUZZLE]', 'sprite pointerdown', puzzle.type, puzzle.id);
                if (gameStateManager.isPuzzleSolved(puzzle.id)) {
                    uiManager.showNotification('Este enigma já foi resolvido.');
                    return;
                }
                this.promptPuzzleInteraction(puzzle.id);
            });
        }
    }

    applySpriteTransform(sprite, transform = {}) {
        if (!sprite) return;

        const parseNumber = (value, fallback) => {
            if (value === null || value === undefined) return fallback;
            const num = typeof value === 'string' ? parseFloat(value) : value;
            return Number.isFinite(num) ? num : fallback;
        };

        const isTrue = (value) => value === true || value === 1 || value === '1';

        if (!sprite.__baseScale) {
            const baseX = parseNumber(sprite.scaleX, 1);
            const baseY = parseNumber(sprite.scaleY, 1);
            sprite.__baseScale = { x: baseX, y: baseY };
        }

        const baseScale = sprite.__baseScale;

        let scaleX = parseNumber(transform.scaleX, 1);
        let scaleY = parseNumber(transform.scaleY, 1);
        if (!('scaleX' in transform) && 'scale' in transform) {
            scaleX = parseNumber(transform.scale, 1);
        }
        if (!('scaleY' in transform) && 'scale' in transform) {
            scaleY = parseNumber(transform.scale, 1);
        }

        if (isTrue(transform.flipX)) {
            scaleX *= -1;
        }
        if (isTrue(transform.flipY)) {
            scaleY *= -1;
        }

        if (sprite.setAngle) {
            sprite.setAngle(parseNumber(transform.rotation, 0));
        }

        if (sprite.setScale) {
            const finalScaleX = baseScale.x * scaleX;
            const finalScaleY = baseScale.y * scaleY;
            sprite.setScale(finalScaleX, finalScaleY);
        }

        if (sprite.setAlpha) {
            if (transform.opacity !== undefined && transform.opacity !== null && transform.opacity !== '') {
                const alpha = parseNumber(transform.opacity, 1);
                sprite.setAlpha(alpha);
            } else {
                sprite.setAlpha(1);
            }
        }
    }

    applyPuzzleTransforms(sprite, transform = {}) {
        if (!sprite) return;
        this.applySpriteTransform(sprite, transform);
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
        this.cancelActiveDroppedItemDrag('scene-reset');
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
            sprite.setDepth(100); // Prioridade máxima sobre tudo

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
            } else if (imagePath) {
                const img = document.createElement('img');
                img.src = imagePath;
                img.style.width = `${size.width}px`;
                img.style.height = `${size.height}px`;
                img.style.pointerEvents = 'auto';

                sprite = this.add.dom(worldX, worldY, img);
                sprite.setOrigin(0.5);
            } else {
                sprite = this.add.text(worldX, worldY, '📦', {
                    fontSize: '28px'
                });
            }

            sprite.setOrigin?.(0.5);
            sprite.setDepth(100); // Prioridade máxima
            this.applySpriteTransform(sprite, transform || {});
        }

        if (!sprite) return;

        sprite.setDepth?.(100); // Garantir prioridade máxima

        const label = this.add.text(worldX, worldY + size.height / 2 + 8, item.name || item.id, {
            fontSize: '12px',
            color: '#f0a500',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 6, y: 3 }
        });
        label.setOrigin(0.5, 0);
        label.setDepth(101); // Label acima do sprite

        const spriteAlpha = typeof sprite.alpha === 'number' ? sprite.alpha : 1;
        const labelAlpha = typeof label.alpha === 'number' ? label.alpha : 1;
        const entry = {
            id: item.id,
            sprite,
            label,
            alpha: spriteAlpha,
            labelAlpha,
            data: item,
            size,
            transform,
            renderMode,
            useDom
        };
        this.attachDroppedItemInteractions(entry);
        this.droppedItemSprites.push(entry);
    }

    attachDroppedItemInteractions(entry) {
        if (!entry || !entry.sprite) return;

        const { sprite, label, useDom } = entry;

        if (useDom && sprite.node) {
            sprite.node.style.cursor = 'grab';
            sprite.node.style.touchAction = 'none';
            sprite.node.style.userSelect = 'none';
            sprite.node.title = 'Clique e arraste para mover';
        }

        if (useDom && typeof sprite.addListener === 'function') {
            sprite.addListener('pointerdown');
            sprite.on('pointerdown', (event) => {
                this.onDroppedSceneItemPointerDown(entry, null, event, 'sprite');
            });
            sprite.addListener('pointerup');
            sprite.addListener('pointerupoutside');
            sprite.on('pointerup', (event) => {
                this.onDroppedSceneItemPointerUp(entry, null, event, 'sprite');
            });
            sprite.on('pointerupoutside', (event) => {
                this.onDroppedSceneItemPointerUp(entry, null, event, 'sprite');
            });
        } else if (useDom && sprite.node) {
            // Fallback: usar eventos DOM nativos quando addListener não existe
            // IMPORTANTE: usar pointerdown/pointerup para ter pointerId consistente com window pointermove
            sprite.node.addEventListener('pointerdown', (event) => {
                debugSceneDrag('dom-pointerdown', { itemId: entry.id, pointerId: event.pointerId });
                // Release pointer capture so window events can work
                if (sprite.node.hasPointerCapture && sprite.node.hasPointerCapture(event.pointerId)) {
                    sprite.node.releasePointerCapture(event.pointerId);
                }
                this.onDroppedSceneItemPointerDown(entry, null, event, 'sprite');
            });
            sprite.node.addEventListener('pointerup', (event) => {
                this.onDroppedSceneItemPointerUp(entry, null, event, 'sprite');
            });
            sprite.node.addEventListener('pointercancel', (event) => {
                this.onDroppedSceneItemPointerUp(entry, null, event, 'sprite');
            });
        } else if (sprite.setInteractive) {
            sprite.setInteractive({ useHandCursor: true, draggable: false });
            sprite.on('pointerdown', (pointer, localX, localY, event) => {
                this.onDroppedSceneItemPointerDown(entry, pointer, event, 'sprite');
            });
            sprite.on('pointerup', (pointer, localX, localY, event) => {
                this.onDroppedSceneItemPointerUp(entry, pointer, event, 'sprite');
            });
            sprite.on('pointerupoutside', (pointer, localX, localY, event) => {
                this.onDroppedSceneItemPointerUp(entry, pointer, event, 'sprite');
            });
        }

        if (label && label.setInteractive) {
            label.setInteractive({ useHandCursor: true });
            label.on('pointerdown', (pointer, localX, localY, event) => {
                this.onDroppedSceneItemPointerDown(entry, pointer, event, 'label');
            });
            label.on('pointerup', (pointer, localX, localY, event) => {
                this.onDroppedSceneItemPointerUp(entry, pointer, event, 'label');
            });
            label.on('pointerupoutside', (pointer, localX, localY, event) => {
                this.onDroppedSceneItemPointerUp(entry, pointer, event, 'label');
            });
        }
    }

    onDroppedSceneItemPointerDown(entry, pointer, event, source = 'sprite') {
        if (!entry) return;
        const pointerInfo = this.resolveScenePointerInfo(pointer, event);
        if (!pointerInfo) {
            debugSceneDrag('pointerdown-missed', { itemId: entry.id, source });
            return;
        }

        debugSceneDrag('pointerdown-resolved', {
            itemId: entry.id,
            source,
            pointerId: pointerInfo.pointerId,
            useDom: entry.useDom,
            hasNode: !!entry.sprite?.node
        });

        // Don't preventDefault or stopPropagation on pointerdown
        // This allows window-level pointermove events to work properly
        // preventDefault should only be on pointermove to prevent scrolling

        this.startSceneItemDrag(entry, pointerInfo, source);
    }

    onDroppedSceneItemPointerUp(entry, pointer, event, source = 'sprite') {
        const nativeEvent = (event && event.event) ? event.event :
            (event instanceof Event ? event : pointer?.event || null);

        debugSceneDrag('pointerup', { itemId: entry?.id, source, hasEvent: !!nativeEvent });

        if (nativeEvent) {
            this.handleSceneItemDragEnd(nativeEvent);
            return;
        }

        if (this.activeDroppedItemDrag && (!entry || this.activeDroppedItemDrag.entry === entry)) {
            const ctx = this.activeDroppedItemDrag;
            const clientX = ctx.lastClientX ?? ctx.startClientX ?? 0;
            const clientY = ctx.lastClientY ?? ctx.startClientY ?? 0;
            this.handleSceneItemDragEnd({
                type: 'pointerup',
                pointerId: ctx.pointerId,
                clientX,
                clientY,
                preventDefault() { },
                stopPropagation() { },
                cancelable: false
            });
        }
    }

    resolveScenePointerInfo(pointer, event) {
        if (pointer && typeof pointer.worldX === 'number' && typeof pointer.worldY === 'number') {
            const nativeEvent = event || pointer.event || null;
            return {
                pointerId: pointer.id ?? pointer.pointerId ?? 0,
                worldX: pointer.worldX,
                worldY: pointer.worldY,
                pointerType: nativeEvent?.pointerType || pointer.pointerType || 'mouse',
                nativeEvent
            };
        }

        const nativeEvent = event instanceof Event ? event : (pointer instanceof Event ? pointer : null);
        if (!nativeEvent) return null;
        const clientX = nativeEvent.clientX ?? nativeEvent.pageX;
        const clientY = nativeEvent.clientY ?? nativeEvent.pageY;
        if (typeof clientX !== 'number' || typeof clientY !== 'number') return null;

        const world = this.clientToWorld(clientX, clientY);
        return {
            pointerId: nativeEvent.pointerId ?? nativeEvent.identifier ?? 0,
            worldX: world.x,
            worldY: world.y,
            pointerType: nativeEvent.pointerType || 'mouse',
            nativeEvent
        };
    }

    startSceneItemDrag(entry, pointerInfo, source = 'sprite') {
        if (!entry || !pointerInfo) return;

        if (this.activeDroppedItemDrag) {
            this.cancelActiveDroppedItemDrag('replace');
        }

        const sprite = entry.sprite;
        const label = entry.label;
        const labelOffset = label ? { x: label.x - sprite.x, y: label.y - sprite.y } : { x: 0, y: 0 };

        this.activeDroppedItemDrag = {
            entry,
            pointerId: pointerInfo.pointerId ?? 0,
            source,
            startSpriteX: sprite.x,
            startSpriteY: sprite.y,
            startWorldX: pointerInfo.worldX,
            startWorldY: pointerInfo.worldY,
            pointerOffsetX: pointerInfo.worldX - sprite.x,
            pointerOffsetY: pointerInfo.worldY - sprite.y,
            labelOffset,
            moved: false,
            pointerType: pointerInfo.pointerType || 'mouse',
            originalDepth: sprite.depth ?? 0,
            originalLabelDepth: label?.depth ?? 0,
            startClientX: pointerInfo.nativeEvent?.clientX ?? null,
            startClientY: pointerInfo.nativeEvent?.clientY ?? null,
            lastClientX: pointerInfo.nativeEvent?.clientX ?? null,
            lastClientY: pointerInfo.nativeEvent?.clientY ?? null
        };

        if (sprite.setDepth) {
            sprite.setDepth(Math.max((sprite.depth ?? 0) + 10, 120));
        }
        if (label?.setDepth) {
            label.setDepth((label.depth ?? 0) + 12);
        }
        if (entry.useDom && sprite.node) {
            sprite.node.style.cursor = 'grabbing';
        }
        document.body.style.cursor = 'grabbing';

        debugSceneDrag('start', {
            itemId: entry.id,
            pointerId: this.activeDroppedItemDrag.pointerId,
            source,
            world: { x: pointerInfo.worldX, y: pointerInfo.worldY }
        });

        this.attachSceneItemDragListeners();
    }

    attachSceneItemDragListeners() {
        if (this._sceneDragListenersAttached) return;
        window.addEventListener('pointermove', this._boundSceneItemDragMove, { passive: false });
        window.addEventListener('pointerup', this._boundSceneItemDragEnd, { passive: false });
        window.addEventListener('pointercancel', this._boundSceneItemDragEnd, { passive: false });
        this._sceneDragListenersAttached = true;
    }

    detachSceneItemDragListeners() {
        if (!this._sceneDragListenersAttached) return;
        window.removeEventListener('pointermove', this._boundSceneItemDragMove);
        window.removeEventListener('pointerup', this._boundSceneItemDragEnd);
        window.removeEventListener('pointercancel', this._boundSceneItemDragEnd);
        this._sceneDragListenersAttached = false;
    }

    handleSceneItemDragMove(event) {
        const ctx = this.activeDroppedItemDrag;
        if (!ctx) {
            debugSceneDrag('move-no-context');
            return;
        }
        const pointerId = this.normalizePointerEventId(event);
        if (pointerId !== ctx.pointerId) {
            debugSceneDrag('move-wrong-pointer', {
                eventPointerId: pointerId,
                contextPointerId: ctx.pointerId
            });
            return;
        }

        if (event && event.cancelable) {
            event.preventDefault();
        }
        event?.stopPropagation?.();

        const world = this.clientToWorld(event.clientX, event.clientY);
        ctx.lastClientX = event.clientX;
        ctx.lastClientY = event.clientY;

        if (!ctx.moved) {
            const distance = Phaser.Math.Distance.Between(world.x, world.y, ctx.startWorldX, ctx.startWorldY);
            if (distance >= this.sceneItemDragThreshold) {
                ctx.moved = true;
                debugSceneDrag('drag', { itemId: ctx.entry.id, pointerId: ctx.pointerId, distance });
            }
        }

        const targetX = world.x - ctx.pointerOffsetX;
        const targetY = world.y - ctx.pointerOffsetY;
        const clamped = this.clampToBackgroundBounds(targetX, targetY, ctx.entry);

        ctx.lastSpriteX = clamped.x;
        ctx.lastSpriteY = clamped.y;

        ctx.entry.sprite.setPosition?.(clamped.x, clamped.y);
        if (ctx.entry.label) {
            ctx.entry.label.setPosition(clamped.x + ctx.labelOffset.x, clamped.y + ctx.labelOffset.y);
        }
    }

    handleSceneItemDragEnd(event) {
        const ctx = this.activeDroppedItemDrag;
        if (!ctx) return;
        const pointerId = this.normalizePointerEventId(event);
        if (pointerId !== ctx.pointerId) return;

        if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
            ctx.lastClientX = event.clientX;
            ctx.lastClientY = event.clientY;
        }

        if (event && event.cancelable) {
            event.preventDefault();
        }
        event?.stopPropagation?.();

        this.detachSceneItemDragListeners();
        document.body.style.cursor = '';

        const { entry } = ctx;
        if (entry?.useDom && entry.sprite?.node) {
            entry.sprite.node.style.cursor = 'grab';
        }

        entry?.sprite?.setDepth?.(ctx.originalDepth ?? entry.sprite.depth);
        entry?.label?.setDepth?.(ctx.originalLabelDepth ?? entry.label.depth);

        this.activeDroppedItemDrag = null;

        if (event.type === 'pointercancel') {
            if (entry?.sprite) {
                entry.sprite.setPosition?.(ctx.startSpriteX, ctx.startSpriteY);
            }
            if (entry?.label) {
                entry.label.setPosition(ctx.startSpriteX + ctx.labelOffset.x, ctx.startSpriteY + ctx.labelOffset.y);
            }
            debugSceneDrag('cancelled', { itemId: entry?.id });
            return;
        }

        if (ctx.moved) {
            const worldX = entry.sprite.x;
            const worldY = entry.sprite.y;
            const percent = this.worldToPercent(worldX, worldY);
            const inPuzzleArea = this.isPointInsidePuzzle(worldX, worldY);
            const updated = gameStateManager.moveDroppedItem(entry.id, this.currentLocation, percent, {
                inPuzzleArea
            });

            debugSceneDrag('end', {
                itemId: entry.id,
                pointerId,
                moved: true,
                world: { x: worldX, y: worldY },
                percent
            });

            if (!updated) {
                uiManager.showNotification('Não foi possível reposicionar este item.', 2500);
                entry.sprite.setPosition(ctx.startSpriteX, ctx.startSpriteY);
                if (entry.label) {
                    entry.label.setPosition(ctx.startSpriteX + ctx.labelOffset.x, ctx.startSpriteY + ctx.labelOffset.y);
                }
            } else {
                this.renderDroppedItems();
                const puzzle = this.locationData.puzzle;
                if (inPuzzleArea && puzzle && puzzle.type === 'item_combination') {
                    this.evaluateItemCombinationPuzzlePlacement(puzzle, entry.id);
                }
            }
        } else {
            debugSceneDrag('click', { itemId: entry.id, pointerId });
            this.pickupDroppedItem(entry.id);
        }
    }

    cancelActiveDroppedItemDrag(reason = 'cancel') {
        if (!this.activeDroppedItemDrag) return;
        const ctx = this.activeDroppedItemDrag;
        const { entry } = ctx;

        debugSceneDrag('cancel', { itemId: entry?.id, reason });

        this.detachSceneItemDragListeners();
        document.body.style.cursor = '';

        if (entry?.useDom && entry.sprite?.node) {
            entry.sprite.node.style.cursor = 'grab';
        }

        entry?.sprite?.setDepth?.(ctx.originalDepth ?? entry.sprite.depth);
        entry?.label?.setDepth?.(ctx.originalLabelDepth ?? entry.label.depth);

        if (entry?.sprite) {
            entry.sprite.setPosition(ctx.startSpriteX, ctx.startSpriteY);
        }
        if (entry?.label) {
            entry.label.setPosition(ctx.startSpriteX + ctx.labelOffset.x, ctx.startSpriteY + ctx.labelOffset.y);
        }

        this.activeDroppedItemDrag = null;
    }

    normalizePointerEventId(event) {
        if (!event) return 0;
        if (typeof event.pointerId === 'number') return event.pointerId;
        return 0;
    }

    clampToBackgroundBounds(x, y, entry) {
        const bounds = this.getBackgroundBounds();
        const size = entry?.data?.dropSize || entry?.size || { width: 80, height: 80 };
        const halfWidth = Math.max(0, Number(size.width) || 0) / 2;
        const halfHeight = Math.max(0, Number(size.height) || 0) / 2;
        const minX = bounds.bgX + halfWidth;
        const maxX = bounds.bgX + bounds.bgWidth - halfWidth;
        const minY = bounds.bgY + halfHeight;
        const maxY = bounds.bgY + bounds.bgHeight - halfHeight;

        return {
            x: Phaser.Math.Clamp(x, minX, maxX),
            y: Phaser.Math.Clamp(y, minY, maxY)
        };
    }

    clientToWorld(clientX, clientY) {
        const rect = this.game.canvas.getBoundingClientRect();
        const baseWidth = this.scale.gameSize.width;
        const baseHeight = this.scale.gameSize.height;
        const localX = ((clientX - rect.left) / rect.width) * baseWidth;
        const localY = ((clientY - rect.top) / rect.height) * baseHeight;
        return this.cameras.main.getWorldPoint(localX, localY);
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

    handlePuzzleSubmission(puzzle, payload = {}) {
        console.log('[PUZZLE]', 'submit', { id: puzzle?.id, type: puzzle?.type, payload });
        if (!puzzle) {
            return { success: false, message: 'Enigma inválido.' };
        }

        if (gameStateManager.isPuzzleSolved(puzzle.id)) {
            return { success: true, message: 'Este enigma já foi resolvido.', closeDelay: 700 };
        }

        const puzzleType = (puzzle.type ?? '').toString().trim().toLowerCase();
        switch (puzzleType) {
            case 'direction':
            case 'riddle':
                return this.evaluateChoicePuzzle(puzzle, payload);
            case 'sequence_symbols':
                return this.evaluateSequencePuzzle(puzzle, payload);
            case 'code':
            case 'math':
                return this.evaluateAnswerPuzzle(puzzle, payload);
            default:
                return {
                    success: false,
                    message: 'Este tipo de enigma ainda não está disponível nesta versão.'
                };
        }
    }

    evaluateChoicePuzzle(puzzle, payload = {}) {
        const selectedIndex = Number(payload.selectedIndex);
        if (!Number.isInteger(selectedIndex)) {
            this.flashPuzzleSprite(0xff6666);
            return { success: false, message: 'Selecione uma opção.' };
        }

        const optionsArray = Array.isArray(puzzle.options) ? puzzle.options : [];
        if (selectedIndex < 0 || selectedIndex >= optionsArray.length) {
            this.flashPuzzleSprite(0xff6666);
            return { success: false, message: 'Opção inválida selecionada.' };
        }

        const correctIndexRaw = puzzle.correctAnswer ?? puzzle.answer;
        const correctIndex = Number(correctIndexRaw);
        if (!Number.isInteger(correctIndex)) {
            return { success: false, message: 'Este enigma está sem resposta configurada.' };
        }
        if (correctIndex < 0 || correctIndex >= optionsArray.length) {
            return { success: false, message: 'Resposta configurada está fora das opções disponíveis.' };
        }

        if (selectedIndex === correctIndex) {
            this.solveCurrentPuzzle(puzzle);
            const message = puzzle.successMessage || 'Resposta correta!';
            console.log('[PUZZLE]', 'choice correta', { selectedIndex, correctIndex });
            return { success: true, message, closeDelay: 900 };
        }

        this.flashPuzzleSprite(0xff6666);
        const hintSuffix = puzzle.hint ? ` Dica: ${puzzle.hint}` : '';
        console.log('[PUZZLE]', 'choice incorreta', { selectedIndex, correctIndex });
        return { success: false, message: `Resposta incorreta.${hintSuffix}` };
    }

    evaluateSequencePuzzle(puzzle, payload = {}) {
        const attemptSequence = Array.isArray(payload.sequence)
            ? payload.sequence.map(step => Number(step)).filter(step => Number.isFinite(step))
            : [];

        if (!attemptSequence.length) {
            this.flashPuzzleSprite(0xff6666);
            return { success: false, message: 'Selecione uma sequência.' };
        }

        const optionsArray = Array.isArray(puzzle.options) ? puzzle.options : [];
        const outOfRange = attemptSequence.some(step => step < 0 || step >= optionsArray.length);
        if (outOfRange) {
            this.flashPuzzleSprite(0xff6666);
            return { success: false, message: 'Sequência contém valores inválidos.' };
        }

        const expectedRaw = Array.isArray(puzzle.correctSequence) ? puzzle.correctSequence
            : Array.isArray(puzzle.sequence) ? puzzle.sequence
            : [];
        const expectedSequence = expectedRaw.map(step => Number(step)).filter(step => Number.isFinite(step));

        if (!expectedSequence.length) {
            return { success: false, message: 'Este enigma está sem sequência configurada.' };
        }

        const isCorrect = attemptSequence.length === expectedSequence.length &&
            attemptSequence.every((value, index) => value === expectedSequence[index]);

        if (isCorrect) {
            this.solveCurrentPuzzle(puzzle);
            const message = puzzle.successMessage || 'Sequência correta!';
            return { success: true, message, closeDelay: 900 };
        }

        this.flashPuzzleSprite(0xff6666);
        const hintSuffix = puzzle.hint ? ` Dica: ${puzzle.hint}` : '';
        return { success: false, message: `Sequência incorreta.${hintSuffix}` };
    }

    evaluateAnswerPuzzle(puzzle, payload = {}) {
        const attemptRaw = (payload.answer ?? '').toString().trim();
        if (!attemptRaw) {
            this.flashPuzzleSprite(0xff6666);
            return { success: false, message: 'Digite uma resposta.' };
        }

        const expectedRaw = puzzle.correctAnswer ?? puzzle.answer;
        if (expectedRaw === undefined || expectedRaw === null || expectedRaw === '') {
            return { success: false, message: 'Este enigma está sem resposta configurada.' };
        }

        const attemptNormalized = attemptRaw.toLowerCase();
        const expectedNormalized = expectedRaw.toString().trim().toLowerCase();

        let isCorrect = attemptNormalized === expectedNormalized;

        const expectedNumber = Number(expectedRaw);
        if (!isCorrect && !Number.isNaN(expectedNumber)) {
            const attemptNumber = Number(attemptRaw.replace(',', '.'));
            if (!Number.isNaN(attemptNumber)) {
                isCorrect = Math.abs(attemptNumber - expectedNumber) < 1e-6;
            }
        }

        if (isCorrect) {
            this.solveCurrentPuzzle(puzzle);
            const message = puzzle.successMessage || 'Resposta correta!';
            return { success: true, message, closeDelay: 900 };
        }

        this.flashPuzzleSprite(0xff6666);
        const hintSuffix = puzzle.hint ? ` Dica: ${puzzle.hint}` : '';
        return {
            success: false,
            message: `Resposta incorreta.${hintSuffix}`
        };
    }

    evaluateItemCombinationPuzzlePlacement(puzzle, itemId) {
        if (!puzzle || puzzle.type !== 'item_combination') return;
        if (gameStateManager.isPuzzleSolved(puzzle.id)) {
            return;
        }

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
            zone.setDepth(10); // Baixa prioridade - items devem ter preferência

            // Label (nome do destino)
            const labelCenterX = x + w / 2;
            const labelCenterY = y + h / 2;
            const label = this.add.text(labelCenterX, labelCenterY, hotspot.label, {
                fontSize: '18px',
                color: '#f0a500',
                backgroundColor: '#000000',
                padding: { x: 10, y: 6 },
                fontStyle: 'bold'
            });
            label.setOrigin(0.5);
            label.setAlpha(0); // Invisível por padrão
            label.setDepth(15); // Acima das zones, mas abaixo dos items

            // Hover effects - apenas label
            zone.on('pointerover', () => {
                this.tweens.killTweensOf(label);
                this.tweens.add({
                    targets: label,
                    alpha: 1,
                    scale: 1.05,
                    duration: 200,
                    ease: 'Power2'
                });
            });

            zone.on('pointerout', () => {
                this.tweens.killTweensOf(label);
                this.tweens.add({
                    targets: label,
                    alpha: 0,
                    scale: 1,
                    duration: 150,
                    ease: 'Power2'
                });
            });

            // Click handler
            zone.on('pointerdown', (pointer) => {
                // Verificar se há um dropped item na posição do clique
                const hasDroppedItemAtPosition = this.droppedItemSprites.some(entry => {
                    if (!entry.sprite) return false;
                    const sprite = entry.sprite;
                    const distance = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, sprite.x, sprite.y);
                    const threshold = Math.max(entry.size?.width || 80, entry.size?.height || 80) / 2;
                    return distance < threshold;
                });

                // Se há dropped item, não processar o hotspot
                if (hasDroppedItemAtPosition) {
                    console.log('[HOTSPOT] Clique ignorado - dropped item na posição');
                    return;
                }

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
                element.setDepth(50); // Prioridade sobre hotspots (depth 10)

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

                    element.setOrigin(0.5);
                    element.setDepth(50); // Prioridade sobre hotspots (depth 10)
                    this.applySpriteTransform(element, transform);

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
                    element.setDepth(50); // Prioridade sobre hotspots (depth 10)
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

        const puzzleType = (puzzle.type ?? 'item_combination').toString().trim().toLowerCase();
        console.log('[PUZZLE]', 'prompt', { id: puzzle.id, type: puzzleType });

        if (puzzleType === 'item_combination') {
            uiManager.showNotification('Arraste o item correto do inventário até o enigma.');
            this.flashPuzzleSprite();
            return;
        }

        const supportedTypes = ['code', 'math', 'direction', 'riddle', 'sequence_symbols'];
        if (supportedTypes.includes(puzzleType)) {
            console.log('[PUZZLE]', 'abrindo dialogo suportado', puzzleType);
            const openDialog = () => {
                console.log('[PUZZLE]', 'executando openDialog');
                const overlay = document.getElementById('puzzle-overlay');
                if (overlay) {
                    overlay.classList.add('active');
                    overlay.style.display = 'flex';
                    overlay.style.pointerEvents = 'auto';
                } else {
                    console.warn('[PUZZLE]', 'overlay do enigma não encontrado');
                }
                uiManager.openPuzzleDialog(puzzle, {
                    onSubmit: (payload) => this.handlePuzzleSubmission(puzzle, payload),
                    onClose: () => {
                        if (!gameStateManager.isPuzzleSolved(puzzle.id)) {
                            this.flashPuzzleSprite();
                        }
                    }
                });
            };
            setTimeout(openDialog, 60);
            this.flashPuzzleSprite(0xf0a500);
            return;
        }

        uiManager.showNotification('Este tipo de enigma ainda não está disponível.');
        console.warn('[PUZZLE]', 'tipo não suportado', puzzleType, puzzle);
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

        this.evaluateItemCombinationPuzzlePlacement(puzzle, itemId);
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

        if (uiManager && typeof uiManager.closePuzzleOverlay === 'function') {
            uiManager.closePuzzleOverlay('scene-shutdown');
        }
    }
}
