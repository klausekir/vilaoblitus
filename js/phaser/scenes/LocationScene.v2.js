const DEBUG_SCENE_DRAG = false; // Desligado - versão funcionando
function debugSceneDrag(...args) {
    if (DEBUG_SCENE_DRAG) {
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
        this.destructibleWalls = [];
    }

    init(data) {
        // Recebe locationId de outras cenas
        if (data && data.locationId) {
            this.currentLocation = data.locationId;
        }
    }

    preload() {
        if (!this.currentLocation) return;

        const locationData = databaseLoader.getLocation(this.currentLocation);
        if (!locationData) return;

        // Show a small loading indication (optional, Phaser handles the wait)
        // this.add.text(...) 


        // Logic similar to BootScene, but specific to this location

        // Background
        const background = locationData.background || locationData.image;
        if (background && !this.textures.exists(this.currentLocation)) {
            this.load.image(this.currentLocation, background);
        }

        // Items
        (locationData.items || []).forEach(item => {
            if (!item.id || !item.image) return;

            const textureKey = `item_${item.id}`;
            if (this.textures.exists(textureKey)) return;

            // ✅ Detectar se é spritesheet (termina com _spritesheet.png)
            if (item.image.includes('_spritesheet.png')) {
                const frameWidth = item.spritesheetFrameWidth || 249;
                const frameHeight = item.spritesheetFrameHeight || 341;

                this.load.spritesheet(textureKey, item.image, {
                    frameWidth: frameWidth,
                    frameHeight: frameHeight
                });
            } else if (item.isDecorative) {
                // Itens decorativos com GIF - pular (usar DOM)
                return;
            } else {
                // Itens normais
                this.load.image(textureKey, item.image);
            }
        });

        // Puzzle
        if (locationData.puzzle && locationData.puzzle.visual) {
            const visual = locationData.puzzle.visual;
            if (visual.beforeImage && !this.textures.exists(`puzzle_${this.currentLocation}_before`)) {
                this.load.image(`puzzle_${this.currentLocation}_before`, visual.beforeImage);
            }
            if (visual.afterImage && !this.textures.exists(`puzzle_${this.currentLocation}_after`)) {
                this.load.image(`puzzle_${this.currentLocation}_after`, visual.afterImage);
            }
        }

        // Rewards
        const rewardId = locationData.puzzle?.reward?.id;
        if (rewardId) {
            const rewardImage = locationData.puzzle.reward.image || `images/items/${rewardId}.png`;
            if (!this.textures.exists(`puzzle_reward_${rewardId}`)) {
                this.load.image(`puzzle_reward_${rewardId}`, rewardImage);
            }
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

        // Renderizar paredes destrutíveis
        this.renderDestructibleWalls();

        // Renderizar enigma (se existir) antes de itens/hotspots
        this.renderPuzzle();

        // Renderizar hotspots
        this.renderHotspots();

        // Renderizar itens
        this.renderItems();
        this.renderDroppedItems();
        this.highlightPendingPuzzleReward();

        // Aplicar scale inicial baseado no zoom da câmera
        this.updateDOMElementsScale();

        // Atualizar UI
        uiManager.updateLocationInfo(this.locationData);

        // Fade in
        this.cameras.main.fadeIn(300, 0, 0, 0);

        // Verificar se é cena final e mostrar créditos DEPOIS de carregar tudo
        if (this.locationData.isFinalScene) {
            // Esperar 5 segundos após o fade-in para mostrar os créditos
            this.time.delayedCall(5000, () => {
                this.showStarWarsCredits();
            });
        }

        // Listener para redimensionamento (Scale.RESIZE muda dimensões do game)
        this.scale.on('resize', this.handleResize, this);

        // Setup zoom com duplo clique
        this.setupDoubleClickZoom();

        // Setup drag para mover a câmera quando em zoom
        this.setupDragPan();

        // Setup navegação por teclado (setas)
        this.setupKeyboardNavigation();
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

    setupDoubleClickZoom() {
        // Estado do zoom
        this.isZoomed = false;
        this.zoomLevel = 3; // 3x zoom
        this.originalZoom = 1;

        // Variáveis para detectar duplo clique manual
        this.lastClickTime = 0;
        this.doubleClickDelay = 300; // ms
        this.clickStartX = 0;
        this.clickStartY = 0;

        // Salvar posição inicial do clique
        this.input.on('pointerdown', (pointer) => {
            this.clickStartX = pointer.x;
            this.clickStartY = pointer.y;
        });

        // Verificar duplo clique apenas no pointerup (se não houve drag)
        this.input.on('pointerup', (pointer) => {
            // Calcular distância entre pointerdown e pointerup
            const dragDistance = Phaser.Math.Distance.Between(
                this.clickStartX, this.clickStartY,
                pointer.x, pointer.y
            );

            // Só considera clique se não moveu muito (menos de 10 pixels)
            if (dragDistance < 10) {
                const currentTime = this.time.now;
                const timeSinceLastClick = currentTime - this.lastClickTime;

                // Se clicou duas vezes dentro de 300ms = duplo clique
                if (timeSinceLastClick < this.doubleClickDelay) {
                    this.handleDoubleClick(pointer);
                    this.lastClickTime = 0; // Reset para evitar triplo clique
                } else {
                    this.lastClickTime = currentTime;
                }
            }
        });

    }

    handleDoubleClick(pointer) {
        // BLOQUEAR COMPLETAMENTE zoom se qualquer puzzle estiver ativo
        const puzzleOverlay = document.getElementById('puzzle-overlay');
        if (puzzleOverlay && puzzleOverlay.style.display === 'flex') {
            return; // BLOQUEAR zoom/unzoom quando puzzle HTML está aberto
        }

        // ShapeMatchPuzzle NÃO bloqueia zoom (os moldes ficam na cena normal)
        if (this.puzzleManager && this.puzzleManager.isAnyPuzzleActive && this.puzzleManager.isAnyPuzzleActive()) {
            const activePuzzle = this.puzzleManager.activePuzzle;
            if (activePuzzle && activePuzzle.constructor.name !== 'ShapeMatchPuzzle') {
                return; // BLOQUEAR zoom/unzoom quando puzzle Phaser está aberto (exceto ShapeMatch)
            }
        }

        const camera = this.cameras.main;

        if (!this.isZoomed) {
            // Fazer zoom na posição clicada

            // Animar zoom
            this.tweens.add({
                targets: camera,
                zoom: this.zoomLevel,
                duration: 500,
                ease: 'Cubic.easeInOut',
                onUpdate: () => {
                    this.updateDOMElementsScale();
                }
            });

            // Centralizar câmera na posição clicada (com animação)
            camera.pan(pointer.worldX, pointer.worldY, 500, 'Cubic.easeInOut');

            this.isZoomed = true;
        } else {
            // Voltar ao zoom normal

            // Animar zoom out
            this.tweens.add({
                targets: camera,
                zoom: this.originalZoom,
                duration: 500,
                ease: 'Cubic.easeInOut',
                onUpdate: () => {
                    this.updateDOMElementsScale();
                }
            });

            // Recentralizar câmera no centro da cena
            const centerX = this.cameras.main.width / 2;
            const centerY = this.cameras.main.height / 2;
            camera.pan(centerX, centerY, 500, 'Cubic.easeInOut');

            this.isZoomed = false;
        }
    }

    updateDOMElementsScale() {
        const zoom = this.cameras.main.zoom;

        // ✅ Itens normais da cena: manter escala fixa E recalcular posição
        if (this.items && Array.isArray(this.items)) {
            const bounds = this.getBackgroundBounds();

            this.items.forEach(item => {
                if (item.sprite) {
                    // ✅ Recalcular posição baseada em porcentagem para evitar drift
                    if (item.sprite.__itemPercentPosition) {
                        const percentPos = item.sprite.__itemPercentPosition;
                        const newX = bounds.bgX + (percentPos.x / 100) * bounds.bgWidth;
                        const newY = bounds.bgY + (percentPos.y / 100) * bounds.bgHeight;
                        item.sprite.x = newX;
                        item.sprite.y = newY;
                    }

                    // ✅ Manter escala 1 para DOM elements
                    if (item.sprite.node && item.sprite.baseTransformString) {
                        item.sprite.setScale(1);
                    }
                }
            });
        }

        // ✅ TAMBÉM escalar itens dropados (incluindo itens travados em puzzles)
        if (this.droppedItemSprites && Array.isArray(this.droppedItemSprites)) {
            this.droppedItemSprites.forEach(entry => {
                if (entry.sprite && entry.sprite.node) {
                    // DOM elements
                    if (entry.locked) {
                        // ✅ Itens travados: manter escala fixa = 1 (tamanho natural da cena)
                        entry.sprite.setScale(1);
                    } else {
                        // Itens não travados: escalar com zoom
                        if (!entry.sprite.__baseZoomScale) {
                            entry.sprite.__baseZoomScale = 1;
                        }
                        entry.sprite.setScale(entry.sprite.__baseZoomScale * zoom);
                    }
                }
                // ✅ Sprites Phaser (travados ou não) seguem o zoom da câmera automaticamente
                // Itens travados agora fazem parte natural da cena e escalam junto com background
            });
        }
    }

    setupDragPan() {
        // Variáveis para controlar o drag
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.cameraStartX = 0;
        this.cameraStartY = 0;

        // Listener para início do drag (pointerdown)
        this.input.on('pointerdown', (pointer) => {
            // Só permite drag se estiver em zoom E não houver puzzle ativo
            // ShapeMatchPuzzle NÃO bloqueia drag (os moldes ficam na cena normal)
            const puzzleOverlay = document.getElementById('puzzle-overlay');
            let isPuzzleActive = (puzzleOverlay && puzzleOverlay.style.display === 'flex');

            if (!isPuzzleActive && this.puzzleManager && this.puzzleManager.isAnyPuzzleActive && this.puzzleManager.isAnyPuzzleActive()) {
                const activePuzzle = this.puzzleManager.activePuzzle;
                // ShapeMatchPuzzle não bloqueia drag
                if (activePuzzle && activePuzzle.constructor.name !== 'ShapeMatchPuzzle') {
                    isPuzzleActive = true;
                }
            }

            if (this.isZoomed && !isPuzzleActive) {
                this.isDragging = true;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.cameraStartX = this.cameras.main.scrollX;
                this.cameraStartY = this.cameras.main.scrollY;
            }
        });

        // Listener para movimento do drag (pointermove)
        this.input.on('pointermove', (pointer) => {
            // Verificar se puzzle está ativo antes de arrastar
            // ShapeMatchPuzzle NÃO bloqueia drag (os moldes ficam na cena normal)
            const puzzleOverlay = document.getElementById('puzzle-overlay');
            let isPuzzleActive = (puzzleOverlay && puzzleOverlay.style.display === 'flex');

            if (!isPuzzleActive && this.puzzleManager && this.puzzleManager.isAnyPuzzleActive && this.puzzleManager.isAnyPuzzleActive()) {
                const activePuzzle = this.puzzleManager.activePuzzle;
                // ShapeMatchPuzzle não bloqueia drag
                if (activePuzzle && activePuzzle.constructor.name !== 'ShapeMatchPuzzle') {
                    isPuzzleActive = true;
                }
            }

            if (this.isDragging && this.isZoomed && !isPuzzleActive) {
                // Calcular o delta do movimento
                const deltaX = (pointer.x - this.dragStartX) / this.cameras.main.zoom;
                const deltaY = (pointer.y - this.dragStartY) / this.cameras.main.zoom;

                // Atualizar posição da câmera
                this.cameras.main.scrollX = this.cameraStartX - deltaX;
                this.cameras.main.scrollY = this.cameraStartY - deltaY;
            }
        });

        // Listener para fim do drag (pointerup)
        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

        // Listener para quando o pointer sai da tela
        this.input.on('pointerout', () => {
            this.isDragging = false;
        });
    }

    setupKeyboardNavigation() {
        // Mapear teclas de seta para direções de hotspot
        const arrowKeyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };

        // Listener para teclas pressionadas
        this.input.keyboard.on('keydown', (event) => {
            const direction = arrowKeyMap[event.key];

            // Se não é uma tecla de seta, ignora
            if (!direction) return;

            // Verificar se há puzzle ativo - não navega se tiver
            // ShapeMatchPuzzle NÃO bloqueia navegação (os moldes ficam na cena normal)
            const puzzleOverlay = document.getElementById('puzzle-overlay');
            const overlayActive = puzzleOverlay && puzzleOverlay.style.display === 'flex';

            let managerActive = false;
            if (this.puzzleManager && this.puzzleManager.isAnyPuzzleActive && this.puzzleManager.isAnyPuzzleActive()) {
                const activePuzzle = this.puzzleManager.activePuzzle;
                // ShapeMatchPuzzle não bloqueia navegação por teclado
                if (activePuzzle && activePuzzle.constructor.name !== 'ShapeMatchPuzzle') {
                    managerActive = true;
                }
            }

            const isPuzzleActive = overlayActive || managerActive;

            if (isPuzzleActive) {
                return;
            }

            // Procurar hotspot com a direção correspondente
            const hotspot = this.locationData.hotspots?.find(h => h.arrowDirection === direction);

            if (hotspot) {
                // Navegar para o hotspot encontrado
                this.handleHotspotClick(hotspot);
            }
        });
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

        // Shape Match puzzle não precisa de visual sprite
        if (puzzle && puzzle.type === 'shape_match') {
            const isSolved = puzzle.id ? gameStateManager.isPuzzleSolved(puzzle.id) : false;

            if (!this.puzzleManager) {
                this.puzzleManager = new PuzzleManager(this);
            }

            const puzzleConfig = {
                ...puzzle,
                solved: isSolved, // Passar estado de resolvido
                onSolved: () => {
                    gameStateManager.solvePuzzle(puzzle.id);
                    uiManager.showNotification('✅ Enigma resolvido!');

                    // Atualizar visual do puzzle (baú abre)
                    setTimeout(() => {
                        this.updatePuzzleVisual();
                    }, 1000);

                    // Dropar recompensa se existir
                    if (puzzle.reward) {
                        setTimeout(() => {
                            const dropPosition = { x: 50, y: 50 };

                            gameStateManager.normalizeInventory();
                            gameStateManager.state.inventory[puzzle.reward.id] = {
                                ...puzzle.reward,
                                status: 'dropped',
                                dropLocation: this.currentLocation,
                                dropPosition: dropPosition
                            };
                            gameStateManager.saveProgress();

                            uiManager.showNotification(`🎁 ${puzzle.reward.name} apareceu!`);
                            this.renderDroppedItems();
                        }, 1500);
                    }
                }
            };

            this.puzzleManager.createPuzzle(puzzleConfig);

            // Se tem visual configurado, continua para renderizar o sprite (baú)
            // Se não tem, retorna aqui
            if (!puzzle.visual) {
                return;
            }
        }

        if (!puzzle || !puzzle.visual) {
            return;
        }

        const visual = puzzle.visual;
        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        const targetWidth = visual.size?.width || 120;
        const targetHeight = visual.size?.height || 120;

        const x = bgX + (visual.position.x / 100) * bgWidth;
        const y = bgY + (visual.position.y / 100) * bgHeight;

        let isSolved = puzzle.id ? gameStateManager.isPuzzleSolved(puzzle.id) : false;

        if (isSolved) {

            // Safeguard: Se o puzzle é de combinação de itens e está marcado como resolvido,
            // mas o jogador ainda tem os itens no inventário (held), então há uma inconsistência.
            // Forçar estado não resolvido para permitir que o jogador resolva corretamente.
            if (puzzle.type === 'item_combination' && puzzle.requiredItems && puzzle.requiredItems.length > 0) {
                const hasRequiredItems = puzzle.requiredItems.some(itemId => {
                    const item = gameStateManager.getInventoryItem(itemId);
                    return item && item.status === 'held';
                });

                if (hasRequiredItems) {
                    console.warn(`[PUZZLE] Inconsistência detectada: ${puzzle.id} está resolvido mas itens ainda estão no inventário. Forçando não-resolvido.`);
                    isSolved = false;

                    // Auto-corrigir o estado removendo da lista de resolvidos
                    const index = gameStateManager.state.solvedPuzzles.indexOf(puzzle.id);
                    if (index > -1) {
                        gameStateManager.state.solvedPuzzles.splice(index, 1);
                        // Não salvamos imediatamente para evitar spam de saves, 
                        // o estado será corrigido quando o jogador resolver o puzzle de verdade.
                    }
                }
            }
        }

        let textureKey = null;

        if (isSolved && visual.afterImage) {
            textureKey = `puzzle_${this.locationData.id}_after`;
        } else if (!isSolved && visual.beforeImage) {
            textureKey = `puzzle_${this.locationData.id}_before`;
        }

        if (textureKey && this.textures.exists(textureKey)) {
            this.puzzleSprite = this.add.image(x, y, textureKey);

            // ✅ Usar tamanho original da imagem (sem redimensionar)
            // Origin padrão (0.5, 0.5 = centro) - mantém compatibilidade com posições já configuradas
            this.puzzleSprite.setScale(1, 1); // ✅ Escala 1:1 sem distorção
        } else {
            // Fallback for missing image
            this.puzzleSprite = this.add.container(x, y);

            const bg = this.add.rectangle(0, 0, targetWidth, targetHeight, 0x8b4513, 0.65);
            bg.setStrokeStyle(2, 0xf0a500);

            const text = this.add.text(0, 0, 'MISSING\nASSET', {
                fontSize: '14px',
                color: '#ff0000',
                align: 'center',
                fontStyle: 'bold'
            });
            text.setOrigin(0.5);

            this.puzzleSprite.add([bg, text]);
            this.puzzleSprite.setSize(targetWidth, targetHeight);
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
                if (gameStateManager.isPuzzleSolved(puzzle.id)) {
                    // ✅ TODOS os puzzles podem ter ação ao clicar quando resolvidos
                    if (puzzle.onUnlockedAction) {
                        this.handlePuzzleUnlockedAction(puzzle);
                    } else {
                        uiManager.showNotification('Este enigma já foi resolvido.');
                    }
                    return;
                }
                this.promptPuzzleInteraction(puzzle.id);
            });
        }

        // 🔍 DEBUG: Sempre logar info do puzzle
        console.log('🎯 PUZZLE DETECTADO:', {
            id: puzzle.id,
            type: puzzle.type,
            isSolved: isSolved,
            temDigitPositions: !!puzzle.digitPositions
        });

        // Renderizar caixinhas de números para cadeado de 5 dígitos
        if (puzzle.type === 'padlock_5digit' && !isSolved) {
            console.log('➡️ Vai renderizar cadeado...');
            this.renderPadlockDigits(puzzle, visual, bgX, bgY, bgWidth, bgHeight);
        } else if (puzzle.type === 'padlock_5digit' && isSolved) {
            console.log('⚠️ Cadeado JÁ RESOLVIDO - não renderiza dígitos');
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

        // ✅ Aplicar todas as transformações, incluindo escala definida no editor
        this.applySpriteTransform(sprite, transform);
    }

    updatePuzzleVisual(solved = false) {
        // Re-renderizar o puzzle para atualizar visual (ex: baú fechado -> aberto)
        this.renderPuzzle();
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
        // ✅ Destruir apenas sprites NÃO travados
        this.droppedItemSprites.forEach(entry => {
            if (!entry.locked) {
                entry.sprite?.destroy();
                entry.label?.destroy();
            }
        });
        // ✅ Manter apenas os sprites travados no array
        this.droppedItemSprites = this.droppedItemSprites.filter(e => e.locked);
    }

    renderDroppedItems() {
        this.clearDroppedSprites();
        const droppedItems = gameStateManager.getDroppedItems(this.currentLocation);
        const bounds = this.getBackgroundBounds();

        // Renderizar itens dropados normais (podem ser movidos)
        if (droppedItems && droppedItems.length > 0) {
            droppedItems.forEach(item => {
                if (!item.dropPosition) return;

                // Não renderizar itens consumidos em puzzles (serão renderizados como placedPuzzleItems)
                if (gameStateManager.state.consumedItems && gameStateManager.state.consumedItems.includes(item.id)) {
                    return;
                }

                const world = this.percentToWorld(item.dropPosition, bounds);
                this.createDroppedItemSprite(item, world.x, world.y);
            });
        }

        // ✅ Renderizar itens travados de puzzles (não podem ser movidos)
        if (gameStateManager.state.placedPuzzleItems) {
            Object.values(gameStateManager.state.placedPuzzleItems).forEach(item => {
                if (item.locationId !== this.currentLocation) return;
                if (!item.position) return;

                const alreadyExists = this.droppedItemSprites.some(e => e.locked && e.id === item.id);
                if (alreadyExists) return;

                const world = this.percentToWorld(item.position, bounds);
                this.createDroppedItemSprite(item, world.x, world.y, true);
            });
        }
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

    createDroppedItemSprite(item, worldX, worldY, locked = false, moldContainer = null) {
        const size = item.dropSize || item.size || { width: 80, height: 80 };

        // ✅ Para itens travados, NÃO usar transforms - deixar comportar como item normal na cena
        let transform = locked ? null : (item.dropTransform || item.transform || null);
        let renderMode = locked ? 'sprite' : (item.renderMode || (transform ? 'dom' : 'sprite'));
        let imagePath = item.image;

        let definition = null;
        if (typeof databaseLoader !== 'undefined' && typeof databaseLoader.getItemDefinition === 'function') {
            definition = databaseLoader.getItemDefinition(item.id);
        }

        // ✅ Itens travados NÃO herdam transforms da definição
        if (!locked && (!transform || (typeof transform === 'object' && Object.keys(transform).length === 0)) && definition && definition.transform) {
            transform = JSON.parse(JSON.stringify(definition.transform));
            if (!item.renderMode) {
                renderMode = 'dom';
            }
        }

        if (!imagePath && definition && definition.image) {
            imagePath = definition.image;
        }

        const useDom = !locked && (renderMode === 'dom' || (transform && (transform.rotateX || transform.rotateY || transform.skewX || transform.skewY)));

        debugSceneDrag('create-dropped-sprite', {
            itemId: item.id,
            renderMode,
            hasTransform: !!transform,
            useDom,
            hasDropTransform: !!item.dropTransform,
            hasItemTransform: !!item.transform
        });

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
                // Textura já existe - usar normalmente
                sprite = this.add.image(worldX, worldY, textureKey);
                sprite.setDisplaySize(size.width, size.height);
                sprite.setOrigin(0.5);
                sprite.setDepth(100);
            } else if (imagePath) {
                // Textura não existe - carregar dinamicamente e criar sprite Phaser
                // Criar retângulo temporário
                sprite = this.add.rectangle(worldX, worldY, size.width, size.height, 0x666666, 0.5);

                // Carregar textura
                this.load.image(textureKey, imagePath);
                this.load.once('complete', () => {

                    if (this.textures.exists(textureKey) && sprite && !sprite.scene) {
                        // Sprite foi destruído, não fazer nada
                        return;
                    }

                    if (this.textures.exists(textureKey)) {
                        // Encontrar o entry atual
                        const entryIndex = this.droppedItemSprites.findIndex(e => e.sprite === sprite);
                        if (entryIndex >= 0) {
                            const entry = this.droppedItemSprites[entryIndex];

                            // Criar novo sprite com imagem
                            const newSprite = this.add.image(sprite.x, sprite.y, textureKey);
                            newSprite.setDisplaySize(size.width, size.height);
                            newSprite.setOrigin(0.5);
                            newSprite.setDepth(100);

                            // Destruir o temporário
                            sprite.destroy();

                            // Atualizar entry
                            entry.sprite = newSprite;
                            entry.useDom = false; // Agora é sprite Phaser puro

                            // Re-anexar listeners
                            this.attachDroppedItemInteractions(entry);
                        }
                    }
                });
                this.load.start();
            } else {
                sprite = this.add.text(worldX, worldY, '📦', {
                    fontSize: '28px'
                });
            }

            sprite.setOrigin?.(0.5);
            sprite.setDepth(100);
            this.applySpriteTransform(sprite, transform || {});
        }

        if (!sprite) return;

        sprite.setDepth?.(100);

        // IMPORTANTE: Recalcular useDom baseado no sprite real criado
        // Mesmo que renderMode seja 'sprite', se criamos um DOM element (quando textura não existe),
        // precisamos usar DOM listeners
        const actualUseDom = !!(sprite.node);

        // ✅ Só criar label se item NÃO estiver travado
        let label = null;
        if (!locked) {
            label = this.add.text(worldX, worldY + size.height / 2 + 8, item.name || item.id, {
                fontSize: '12px',
                color: '#f0a500',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: { x: 6, y: 3 }
            });
            label.setOrigin(0.5, 0);
            label.setDepth(101); // Label acima do sprite
        }

        const spriteAlpha = typeof sprite.alpha === 'number' ? sprite.alpha : 1;
        const labelAlpha = label ? (typeof label.alpha === 'number' ? label.alpha : 1) : 1;
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
            useDom: actualUseDom,  // Usar o valor recalculado!
            locked: locked  // ✅ Marcar se item está travado
        };

        this.attachDroppedItemInteractions(entry);
        this.droppedItemSprites.push(entry);
    }

    attachDroppedItemInteractions(entry) {
        if (!entry || !entry.sprite) return;

        const { sprite, label } = entry;

        // Detectar se é DOMElement
        const isDomElement = !!(sprite.node);

        if (isDomElement && sprite.node) {
            // Para DOMElements, usar event listeners DOM nativos
            const domNode = sprite.node;
            domNode.style.cursor = entry.locked ? 'not-allowed' : 'pointer'; // ✅ Cursor diferente para travados

            domNode.addEventListener('pointerdown', (event) => {
                event.stopPropagation();
                event.preventDefault();
                const pointer = this.input.activePointer;
                this.onDroppedSceneItemPointerDown(entry, pointer, event, 'sprite');
            });

            domNode.addEventListener('pointerup', (event) => {
                event.stopPropagation();
                event.preventDefault();
                const pointer = this.input.activePointer;
                this.onDroppedSceneItemPointerUp(entry, pointer, event, 'sprite');
            });

        } else if (sprite.setInteractive) {
            // Para sprites Phaser normais
            sprite.setInteractive({
                useHandCursor: !entry.locked, // ✅ Sem hand cursor se travado
                pixelPerfect: false
            });

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
        if (!pointerInfo) return;

        this.startSceneItemDrag(entry, pointerInfo, source);
    }

    onDroppedSceneItemPointerUp(entry, pointer, event, source = 'sprite') {
        const nativeEvent = (event && event.event) ? event.event :
            (event instanceof Event ? event : pointer?.event || null);

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
            // Usar o pointerId correto do evento DOM se disponível
            const pointerId = pointer.pointerId ?? pointer.id ?? 0;

            return {
                pointerId,
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

        // ✅ Não permitir arrastar itens travados (conectados em puzzles)
        if (entry.locked) {
            return;
        }

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
        if (!ctx) return;

        const pointerId = this.normalizePointerEventId(event);

        // Aceitar tanto pointer.id (0) quanto event.pointerId (1) para mouse
        const isMousePointer = (pointerId === 0 || pointerId === 1) && (ctx.pointerId === 0 || ctx.pointerId === 1);
        if (!isMousePointer && pointerId !== ctx.pointerId) return;

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

        // Aceitar tanto pointer.id (0) quanto event.pointerId (1) para mouse
        const isMousePointer = (pointerId === 0 || pointerId === 1) && (ctx.pointerId === 0 || ctx.pointerId === 1);
        if (!isMousePointer && pointerId !== ctx.pointerId) {
            return;
        }

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
            return { success: true, message, closeDelay: 900 };
        }

        this.flashPuzzleSprite(0xff6666);
        const hintSuffix = puzzle.hint ? ` Dica: ${puzzle.hint}` : '';
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

        // DEBUG: Log required items

        if (required.length === 0) {
            console.warn('[PUZZLE_DEBUG] No required items configured! Solving immediately.');
            this.solveCurrentPuzzle(puzzle, [itemId]);
            return;
        }

        if (!required.includes(itemId)) {
            uiManager.showNotification('Este item não parece encaixar aqui.', 2500);
            this.flashPuzzleSprite(0xff6666);
            return;
        }

        // Verificar quais itens já foram dropados na área do puzzle
        const droppedItems = gameStateManager.getDroppedItems(this.currentLocation)
            .filter(item => item.dropInPuzzleArea)
            .map(item => item.id);


        const missing = required.filter(id => !droppedItems.includes(id));

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
                stroke: '#000000',
                strokeThickness: 4,
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
            // ✅ Itens decorativos SEMPRE renderizam (não são coletáveis)
            if (!item.isDecorative) {
                if (gameStateManager.isItemCollected(item.id)) return;

                // Não renderizar itens consumidos em puzzles
                if (gameStateManager.state.consumedItems && gameStateManager.state.consumedItems.includes(item.id)) {
                    return;
                }
            }

            if (!item.image || !item.position) {
                console.warn('Item sem dados de imagem ou posição:', item);
                return;
            }

            const x = bgX + (item.position.x / 100) * bgWidth;
            const y = bgY + (item.position.y / 100) * bgHeight;

            // ✅ Usar DOM para transforms 3D/skew, sprites Phaser para o resto
            const size = item.size || { width: 80, height: 80 };
            const transform = item.transform || {};
            const textureKey = `item_${item.id}`;
            let element;

            // ✅ Detectar se é spritesheet
            const isSpritesheet = item.image && item.image.includes('_spritesheet.png');

            // Verificar se precisa de DOM
            // DOM apenas para: transforms 3D/skew OU decorativo com GIF (não spritesheet)
            const needsDOM = !isSpritesheet && (
                (item.isDecorative) ||
                (transform && (
                    (transform.rotateX && transform.rotateX !== 0) ||
                    (transform.rotateY && transform.rotateY !== 0) ||
                    (transform.skewX && transform.skewX !== 0) ||
                    (transform.skewY && transform.skewY !== 0)
                ))
            );

            if (needsDOM) {
                // ✅ Usar DOM element para transforms 3D/skew (e itens decorativos para GIF)
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.width = `${size.width}px`;
                wrapper.style.height = `${size.height}px`;
                wrapper.style.perspective = `${transform.perspective || 800}px`;
                wrapper.style.transformStyle = 'preserve-3d';
                wrapper.style.userSelect = 'none'; // Prevenir seleção de texto
                wrapper.style.webkitUserSelect = 'none';
                wrapper.style.msUserSelect = 'none';

                const img = document.createElement('img');
                img.src = item.image;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.display = 'block';
                img.style.transformStyle = 'preserve-3d';
                img.style.position = 'absolute';
                img.style.left = '50%';
                img.style.top = '50%';
                img.style.userSelect = 'none'; // Prevenir seleção
                img.style.webkitUserSelect = 'none';
                img.style.msUserSelect = 'none';
                img.draggable = false; // Prevenir drag da imagem
                // ✅ Desabilitar pointer events para itens decorativos (não coletáveis)
                img.style.pointerEvents = item.isDecorative ? 'none' : 'auto';

                // Construir transforms CSS
                const transforms = [];
                transforms.push('translate(-50%, -50%)');
                transforms.push(`rotateZ(${transform.rotation || 0}deg)`);
                transforms.push(`rotateX(${transform.rotateX || 0}deg)`);
                transforms.push(`rotateY(${transform.rotateY || 0}deg)`);

                const scaleX = (transform.scaleX || 1) * (transform.flipX ? -1 : 1);
                const scaleY = (transform.scaleY || 1) * (transform.flipY ? -1 : 1);
                transforms.push(`scaleX(${scaleX})`);
                transforms.push(`scaleY(${scaleY})`);

                transforms.push(`skewX(${transform.skewX || 0}deg)`);
                transforms.push(`skewY(${transform.skewY || 0}deg)`);

                img.style.transform = transforms.join(' ');
                img.style.transformOrigin = 'center center';

                if (transform.opacity !== undefined) {
                    img.style.opacity = transform.opacity;
                }

                const shadowBlur = transform.shadowBlur || 0;
                if (shadowBlur > 0) {
                    const shadowX = transform.shadowOffsetX || 0;
                    const shadowY = transform.shadowOffsetY || 0;
                    img.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.5))`;
                }

                wrapper.appendChild(img);
                element = this.add.dom(x, y, wrapper);
                element.setOrigin(0.5);
                element.setDepth(50);
                element.baseTransformString = transforms.join(' ');

            } else if (isSpritesheet && this.textures.exists(textureKey)) {
                // ✅ SPRITESHEET ANIMADO - criar sprite animado
                element = this.add.sprite(x, y, textureKey);
                element.setOrigin(0.5);
                element.setDepth(50);

                // Criar animação se ainda não existir
                const animKey = `${item.id}_anim`;
                if (!this.anims.exists(animKey)) {
                    const texture = this.textures.get(textureKey);
                    const frameCount = texture.frameTotal;

                    this.anims.create({
                        key: animKey,
                        frames: this.anims.generateFrameNumbers(textureKey, {
                            start: 0,
                            end: frameCount - 1
                        }),
                        frameRate: item.spritesheetFrameRate || 10, // FPS customizável
                        repeat: -1 // Loop infinito
                    });
                }

                // Reproduzir animação
                element.play(animKey);
                element.setDisplaySize(size.width, size.height);

                // Aplicar transforms
                this.applySpriteTransform(element, transform);

                // Interatividade: APENAS se NÃO for decorativo
                if (!item.isDecorative) {
                    element.setInteractive({ useHandCursor: true });
                    element.on('pointerdown', () => {
                        this.collectItem(item, element);
                    });
                }

                // Salvar posição percentual para zoom
                element.__itemPercentPosition = {
                    x: item.position.x,
                    y: item.position.y
                };

            } else if (this.textures.exists(textureKey)) {
                // ✅ Usar sprite Phaser para items sem transforms 3D
                element = this.add.image(x, y, textureKey);
                element.setDisplaySize(size.width, size.height);
            } else if (item.image) {
                // Criar temporário e carregar textura
                element = this.add.rectangle(x, y, size.width, size.height, 0x666666, 0.3);
                this.load.image(textureKey, item.image);
                this.load.once('complete', () => {
                    if (this.textures.exists(textureKey) && element && element.scene) {
                        const newSprite = this.add.image(x, y, textureKey);
                        newSprite.setDisplaySize(size.width, size.height);
                        newSprite.setOrigin(0.5);
                        newSprite.setDepth(50);

                        // ✅ Aplicar transforms básicos ao sprite carregado
                        this.applySpriteTransform(newSprite, transform);

                        // ✅ Adicionar interatividade SOMENTE se NÃO for decorativo
                        if (!item.isDecorative) {
                            newSprite.setInteractive({ useHandCursor: true });
                            newSprite.on('pointerdown', () => this.collectItem(item));
                        }
                        element.destroy();
                        const itemIndex = this.items.findIndex(i => i.data?.id === item.id);
                        if (itemIndex >= 0) {
                            this.items[itemIndex].sprite = newSprite;
                        }
                    }
                });
                this.load.start();
            }

            // ✅ Configurar interatividade (diferente para DOM vs Sprite)
            if (element) {
                if (needsDOM) {
                    // ✅ DOM elements: adicionar interatividade SOMENTE se NÃO for decorativo
                    if (!item.isDecorative) {
                        element.addListener('pointerover');
                        element.on('pointerover', () => {
                            const img = element.node.querySelector('img');
                            if (img) img.style.filter = (img.style.filter || '') + ' brightness(1.2)';
                        });

                        element.addListener('pointerout');
                        element.on('pointerout', () => {
                            const img = element.node.querySelector('img');
                            if (img) {
                                const shadowBlur = transform.shadowBlur || 0;
                                if (shadowBlur > 0) {
                                    const shadowX = transform.shadowOffsetX || 0;
                                    const shadowY = transform.shadowOffsetY || 0;
                                    img.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.5))`;
                                } else {
                                    img.style.filter = '';
                                }
                            }
                        });

                        element.addListener('pointerdown');
                        element.on('pointerdown', () => {
                            this.collectItem(item, element);
                        });
                    }

                } else {
                    // Sprites Phaser: comportamento normal
                    element.setOrigin(0.5);
                    element.setDepth(50);

                    // Aplicar transforms básicos
                    this.applySpriteTransform(element, transform);

                    // ✅ Adicionar interatividade SOMENTE se NÃO for decorativo
                    if (!item.isDecorative) {
                        element.setInteractive({ useHandCursor: true });

                        const originalScaleX = element.scaleX;
                        const originalScaleY = element.scaleY;

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

                        element.on('pointerdown', () => {
                            this.collectItem(item, element);
                        });
                    }
                }
            }

            if (false) { // ✅ CÓDIGO ANTIGO DOM/SPRITE - DESABILITADO
                const wrapper = 'antigo';
                wrapper.style.height = (item.size?.height || 80) + 'px';
                wrapper.style.perspective = '1000px';
                wrapper.style.transformStyle = 'preserve-3d';

                // Criar img dentro do wrapper
                const img = document.createElement('img');
                img.src = item.image;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.display = 'block';
                img.style.transformStyle = 'preserve-3d';
                img.style.position = 'absolute';
                img.style.left = '50%';
                img.style.top = '50%';
                img.style.pointerEvents = 'auto';

                // Construir transforms CSS - MESMA ORDEM DO EDITOR
                const transforms = [];
                transforms.push('translate(-50%, -50%)'); // Centralizar
                transforms.push(`rotateZ(${transform.rotation || 0}deg)`);
                transforms.push(`rotateX(${transform.rotateX || 0}deg)`);
                transforms.push(`rotateY(${transform.rotateY || 0}deg)`);

                const scaleX = (transform.scaleX || 1) * (transform.flipX ? -1 : 1);
                const scaleY = (transform.scaleY || 1) * (transform.flipY ? -1 : 1);
                transforms.push(`scaleX(${scaleX})`);
                transforms.push(`scaleY(${scaleY})`);

                transforms.push(`skewX(${transform.skewX || 0}deg)`);
                transforms.push(`skewY(${transform.skewY || 0}deg)`);

                img.style.transform = transforms.join(' ');
                img.style.transformOrigin = 'center center';

                // Opacidade
                if (transform.opacity !== undefined) {
                    img.style.opacity = transform.opacity;
                }

                // Sombra
                const shadowBlur = transform.shadowBlur || 0;
                if (shadowBlur > 0) {
                    const shadowX = transform.shadowOffsetX || 0;
                    const shadowY = transform.shadowOffsetY || 0;
                    const shadowFilter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.5))`;
                    img.style.filter = shadowFilter;
                }

                wrapper.appendChild(img);

                // Criar DOMElement
                element = this.add.dom(x, y, wrapper);
                element.setOrigin(0.5);
                element.setDepth(50);

                // Armazenar referências para atualizar durante zoom
                element.imgElement = img;
                element.transformData = transform;
                element.baseTransformString = transforms.join(' '); // Transform SEM zoom

                // Eventos
                element.addListener('pointerover');
                element.on('pointerover', () => {
                    const currentFilter = img.style.filter || '';
                    const shadowFilter = shadowBlur > 0 ? `drop-shadow(${transform.shadowOffsetX || 0}px ${transform.shadowOffsetY || 0}px ${shadowBlur}px rgba(0,0,0,0.5))` : '';
                    img.style.filter = shadowFilter ? `${shadowFilter} brightness(1.2)` : 'brightness(1.2)';
                });

                element.addListener('pointerout');
                element.on('pointerout', () => {
                    const shadowFilter = shadowBlur > 0 ? `drop-shadow(${transform.shadowOffsetX || 0}px ${transform.shadowOffsetY || 0}px ${shadowBlur}px rgba(0,0,0,0.5))` : '';
                    img.style.filter = shadowFilter;
                });

                element.addListener('pointerdown');
                element.on('pointerdown', () => {
                    this.collectItem(item, element);
                });

            } else { // ✅ CÓDIGO ANTIGO - TB DESABILITADO
                // Este bloco else está desabilitado - código acima já criou sprite
                if (false) {
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
                    // this.applySpriteTransform removido

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
                } // Fecha if (false) da linha 1951
            }

            // ✅ Salvar posição percentual para recalcular durante zoom
            if (element) {
                element.__itemPercentPosition = { x: item.position.x, y: item.position.y };
            }

            this.items.push({ sprite: element, data: item });
        });
    }

    handleHotspotClick(hotspot) {
        switch (hotspot.action) {
            case 'navigate':
            case 'navigation':
                // Aceitar ambos target e targetLocation para compatibilidade
                const targetId = hotspot.targetLocation || hotspot.target;
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

        if (puzzleType === 'item_combination') {
            uiManager.showNotification('Arraste o item correto do inventário até o enigma.');
            this.flashPuzzleSprite();
            return;
        }

        if (puzzleType === 'padlock_5digit') {
            uiManager.showNotification('Clique nos dígitos para girar os números.');
            this.flashPuzzleSprite();
            return;
        }

        const supportedTypes = ['code', 'math', 'direction', 'riddle', 'sequence_symbols'];
        if (supportedTypes.includes(puzzleType)) {
            const openDialog = () => {
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

        // Puzzles do PuzzleManager (Phaser)
        const phaserPuzzleTypes = ['egyptian', 'rotating_discs', 'pattern', 'sequence_buttons', 'shape_match'];
        if (phaserPuzzleTypes.includes(puzzleType)) {

            if (!this.puzzleManager) {
                this.puzzleManager = new PuzzleManager(this);
            }

            const puzzleConfig = {
                ...puzzle,
                onSolved: () => {

                    // Resolver puzzle primeiro (sem recompensa ainda)
                    gameStateManager.solvePuzzle(puzzle.id);


                    uiManager.showNotification('✅ Enigma resolvido!');

                    // Dropar recompensa DEPOIS que o baú abre (2.5 segundos)
                    if (puzzle.reward) {
                        setTimeout(() => {
                            const puzzleX = puzzle.visual.position.x;
                            const puzzleY = puzzle.visual.position.y;

                            // Dropar item na frente do baú (8% abaixo)
                            const dropPosition = {
                                x: puzzleX,
                                y: puzzleY + 8
                            };


                            // Adicionar recompensa ao inventário com status 'dropped'
                            gameStateManager.normalizeInventory();
                            gameStateManager.state.inventory[puzzle.reward.id] = {
                                ...puzzle.reward,
                                status: 'dropped',
                                dropLocation: this.currentLocation,
                                dropPosition: dropPosition
                            };
                            gameStateManager.saveProgress();

                            uiManager.showNotification(`🎁 ${puzzle.reward.name} apareceu!`);

                            // Atualizar itens no cenário para mostrar a recompensa
                            this.renderDroppedItems();
                        }, 2500);
                    }

                    setTimeout(() => {
                        this.updatePuzzleVisual();
                    }, 2000);
                }
            };

            this.puzzleManager.createPuzzle(puzzleConfig);
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

        // Verificar interação com paredes destrutíveis
        const wallHit = this.checkWallInteraction(worldPoint.x, worldPoint.y);
        if (wallHit) {
            this.handleWallInteraction(wallHit, itemId);
            return;
        }

        // Lista de ferramentas/armas que só podem ser usadas em paredes
        const toolsOnly = ['gun', 'martelo', 'picareta', 'machado', 'britadeira'];
        if (toolsOnly.includes(itemId)) {
            uiManager.showNotification('Este item só pode ser usado em paredes destrutíveis.');
            return;
        }

        const bounds = this.getBackgroundBounds();

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

    renderDestructibleWalls() {
        // Limpar paredes antigas
        if (this.destructibleWalls) {
            this.destructibleWalls.forEach(wall => wall.destroy());
        }
        this.destructibleWalls = [];

        const walls = this.locationData.destructibleWalls || [];
        if (!walls.length) return;

        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();

        // Primeiro, carregar todas as texturas necessárias
        const texturesToLoad = [];
        walls.forEach(wallData => {
            if (wallData.image && !this.textures.exists(wallData.id)) {
                texturesToLoad.push({ key: wallData.id, path: wallData.image });
            }
        });

        // Se há texturas para carregar, carregar dinamicamente
        if (texturesToLoad.length > 0) {
            texturesToLoad.forEach(tex => {
                this.load.image(tex.key, tex.path);
            });

            this.load.once('complete', () => {
                this.createWallSprites(walls, bgWidth, bgHeight, bgX, bgY);
            });

            this.load.start();
        } else {
            // Todas as texturas já estão carregadas
            this.createWallSprites(walls, bgWidth, bgHeight, bgX, bgY);
        }
    }

    createWallSprites(walls, bgWidth, bgHeight, bgX, bgY) {
        walls.forEach(wallData => {
            // Se já foi destruída, não renderizar
            if (gameStateManager.isWallDestroyed(this.currentLocation, wallData.id)) {
                return;
            }

            const x = bgX + (wallData.x / 100) * bgWidth;
            const y = bgY + (wallData.y / 100) * bgHeight;
            const width = (wallData.width / 100) * bgWidth;
            const height = (wallData.height / 100) * bgHeight;

            let wallSprite;

            // Usar a textura carregada dinamicamente
            if (wallData.image && this.textures.exists(wallData.id)) {
                wallSprite = this.add.image(x + width / 2, y + height / 2, wallData.id);
            } else {
                // Fallback: usar textura padrão
                wallSprite = this.add.image(x + width / 2, y + height / 2, 'wall_texture');
            }

            wallSprite.setDisplaySize(width, height);
            wallSprite.setOrigin(0.5);
            wallSprite.setDepth(25); // Acima do background, abaixo de itens
            wallSprite.setInteractive();

            // Salvar referência
            wallSprite.wallData = wallData;
            this.destructibleWalls.push(wallSprite);
        });
    }

    checkWallInteraction(worldX, worldY) {
        if (!this.destructibleWalls) return null;

        for (const wallSprite of this.destructibleWalls) {
            const bounds = wallSprite.getBounds();
            if (bounds.contains(worldX, worldY)) {
                return wallSprite.wallData;
            }
        }
        return null;
    }

    handleWallInteraction(wallData, itemId) {
        const requiredItem = wallData.requiredItem || 'gun'; // Default para 'gun'

        if (itemId !== requiredItem) {
            uiManager.showNotification('Este item não parece funcionar aqui.');
            return;
        }

        // Calcular posição de origem (inventário/mouse) e destino (parede)
        // Como é drag and drop, a origem é onde o mouse está agora (aproximadamente)
        const pointer = this.input.activePointer;
        const startX = pointer.worldX; // Ou uma posição fixa fora da tela se preferir
        const startY = this.cameras.main.height; // Simular vindo de baixo (inventário)

        const { bgWidth, bgHeight, bgX, bgY } = this.getBackgroundBounds();
        const targetX = bgX + (wallData.x / 100) * bgWidth + ((wallData.width / 100) * bgWidth) / 2;
        const targetY = bgY + (wallData.y / 100) * bgHeight + ((wallData.height / 100) * bgHeight) / 2;

        this.fireProjectile(startX, startY, targetX, targetY, () => {
            // Callback quando o projétil atingir
            this.destroyWall(wallData);
        });
    }

    fireProjectile(startX, startY, targetX, targetY, onHit) {
        // Criar sprite do projétil
        const projectile = this.add.image(startX, startY, 'projectile_bullet');
        projectile.setDisplaySize(20, 20);
        projectile.setDepth(200);

        // Calcular ângulo
        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);

        // Efeito de rastro (opcional, simples)
        const particles = this.add.particles(0, 0, 'flare', {
            speed: 100,
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            follow: projectile
        });

        // Tween de movimento
        this.tweens.add({
            targets: projectile,
            x: targetX,
            y: targetY,
            duration: 300, // Rápido
            ease: 'Linear',
            onComplete: () => {
                projectile.destroy();
                if (particles) particles.destroy();

                // Efeito de explosão
                const explosion = this.add.circle(targetX, targetY, 10, 0xffaa00);
                this.tweens.add({
                    targets: explosion,
                    scale: 5,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => explosion.destroy()
                });

                if (onHit) onHit();
            }
        });
    }

    destroyWall(wallData) {
        // Encontrar o sprite da parede
        const wallSprite = this.destructibleWalls.find(w => w.wallData.id === wallData.id);

        if (wallSprite) {
            const wallX = wallSprite.x;
            const wallY = wallSprite.y;
            const wallWidth = wallSprite.displayWidth || 100;
            const wallHeight = wallSprite.displayHeight || 100;

            // 1. Efeito de tremor na câmera
            this.cameras.main.shake(200, 0.005);

            // 2. Criar pedaços de detritos (usando retângulos simples)
            const debrisCount = 15;

            for (let i = 0; i < debrisCount; i++) {
                const size = Phaser.Math.Between(8, 20);
                const debris = this.add.rectangle(
                    wallX + Phaser.Math.Between(-wallWidth / 4, wallWidth / 4),
                    wallY + Phaser.Math.Between(-wallHeight / 4, wallHeight / 4),
                    size,
                    size,
                    0x8B7355
                );
                debris.setDepth(100);

                const angle = Phaser.Math.Between(-30, 210);
                const speed = Phaser.Math.Between(60, 150);
                const velocityX = Math.cos(angle * Math.PI / 180) * speed;
                const velocityY = Math.sin(angle * Math.PI / 180) * speed;

                const gravity = 600;
                const duration = 2500;

                this.tweens.add({
                    targets: debris,
                    x: debris.x + velocityX * (duration / 1000),
                    y: debris.y + velocityY * (duration / 1000) + (0.5 * gravity * Math.pow(duration / 1000, 2)),
                    angle: Phaser.Math.Between(-360, 360),
                    alpha: { from: 1, to: 0 },
                    duration: duration,
                    ease: 'Quad.easeIn',
                    onComplete: () => debris.destroy()
                });
            }

            // 3. Flash branco no ponto de impacto
            const flash = this.add.circle(wallX, wallY, 30, 0xFFFFFF, 1);
            flash.setDepth(110);
            this.tweens.add({
                targets: flash,
                scale: 3,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => flash.destroy()
            });

            // 4. Animação de "esmaecer" a parede usando Phaser tween
            this.tweens.add({
                targets: wallSprite,
                alpha: 0,
                scaleX: wallSprite.scaleX * 1.05,
                scaleY: wallSprite.scaleY * 1.05,
                duration: 1200,
                ease: 'Power2',
                onComplete: () => {
                    gameStateManager.destroyWall(this.currentLocation, wallData.id);
                    this.renderDestructibleWalls();
                }
            });

            // Tocar som de pedra quebrando (se houver)
            // this.sound.play('rock_break');
        } else {
            // Fallback se não achar o elemento (ex: erro de sync)
            gameStateManager.destroyWall(this.currentLocation, wallData.id);
            this.renderDestructibleWalls();
        }

        uiManager.showNotification('Caminho liberado!');
    }

    navigateToLocation(targetLocationId, hotspot) {
        if (!targetLocationId) {
            console.error('❌ targetLocationId está vazio ou undefined!');
            return;
        }

        // Verificar se o destino existe
        const targetLocationData = databaseLoader.getLocation(targetLocationId);
        if (!targetLocationData) {
            console.error('❌ Localização de destino não encontrada:', targetLocationId);
            uiManager.showNotification('Localização não encontrada: ' + targetLocationId);
            return;
        }

        // VERIFICAR SE É CENA FINAL E TEM VÍDEO
        if (targetLocationData.isFinalScene) {
            const videoPath = targetLocationData.transitionVideo || 'images/Fuga_da_Vila_com_Salvação_Policial.mp4';
            const dramaticMessages = targetLocationData.dramaticMessages;
            const messageDuration = targetLocationData.dramaticMessageDuration || 5;

            const navigateToFinalScene = () => {
                // Atualizar estado
                gameStateManager.navigateToLocation(targetLocationId);
                // Reiniciar cena com nova location
                this.scene.restart({ locationId: targetLocationId });
            };

            if (videoPath || dramaticMessages) {
                // Sequência: Mensagens Dramáticas → Vídeo → Cena Final
                if (dramaticMessages) {
                    // 1. Mostrar mensagens dramáticas primeiro
                    this.showDramaticMessages(dramaticMessages, messageDuration, () => {
                        // 2. Após mensagens, tocar vídeo (se houver)
                        if (videoPath) {
                            this.playTransitionVideo(videoPath, navigateToFinalScene);
                        } else {
                            navigateToFinalScene();
                        }
                    });
                } else if (videoPath) {
                    // Apenas vídeo, sem mensagens
                    this.playTransitionVideo(videoPath, navigateToFinalScene);
                }
                return; // NÃO continuar com a navegação normal
            }
        }

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


        // Animação de pan e zoom
        this.cameras.main.pan(centerX, centerY, 700, 'Cubic.easeInOut');
        this.cameras.main.zoomTo(zoomLevel, 700, 'Cubic.easeInOut');

        // Fade out e trocar cena
        this.time.delayedCall(500, () => {
            this.cameras.main.fadeOut(200, 0, 0, 0);
        });

        this.cameras.main.once('camerafadeoutcomplete', () => {

            // Atualizar estado
            gameStateManager.navigateToLocation(targetLocationId);

            // Reiniciar cena com nova location
            this.scene.restart({ locationId: targetLocationId });
        });
    }

    collectItem(item, element) {
        // ✅ SAFETY: Nunca coletar itens decorativos
        if (item.isDecorative) {
            console.warn('Tentativa de coletar item decorativo bloqueada:', item.id);
            return;
        }

        const collected = gameStateManager.collectItem(item);

        if (collected) {
            uiManager.showNotification(`✓ Você pegou: ${item.name}`);
            uiManager.renderInventory();

            // Remover do array items
            const itemIndex = this.items.findIndex(i => i.data?.id === item.id);
            if (itemIndex > -1) {
                this.items.splice(itemIndex, 1);
            }

            // Destruir elemento
            if (element) {
                // DOMElements precisam ser destruídos imediatamente (tweens não funcionam)
                if (element.node) {
                    element.destroy();
                } else {
                    // Remover todos os event listeners para não interferir com a animação
                    element.removeAllListeners();

                    // Cancelar tweens antigos (hover) antes de criar novo
                    this.tweens.killTweensOf(element);

                    // Sprites podem ter animação
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
            }
        } else {
            uiManager.showNotification('Você já pegou este item');
        }
    }

    openPuzzle(puzzleId) {
        this.promptPuzzleInteraction(puzzleId);
    }

    handleInventoryDrop(itemId, pointerPosition) {
        // Converter posição do pointer (tela) para coordenadas do mundo Phaser
        const worldX = this.cameras.main.scrollX + pointerPosition.x;
        const worldY = this.cameras.main.scrollY + pointerPosition.y;

        // PRIORIDADE 1: Verificar se há um ShapeMatchPuzzle ativo
        if (this.puzzleManager && this.puzzleManager.activePuzzle &&
            this.puzzleManager.activePuzzle.constructor.name === 'ShapeMatchPuzzle') {

            const puzzle = this.puzzleManager.activePuzzle;

            // Verificar se o drop foi em algum molde
            for (let mold of puzzle.molds) {
                const moldWorldX = mold.container.x;
                const moldWorldY = mold.container.y;
                const distance = Phaser.Math.Distance.Between(worldX, worldY, moldWorldX, moldWorldY);

                // Se caiu dentro de 60px do centro do molde, considerar como drop
                if (distance < 60) {
                    // Criar objeto temporário para passar ao onDropToMold
                    const draggedObject = {
                        itemData: {
                            id: itemId
                        }
                    };

                    puzzle.onDropToMold(mold, draggedObject);
                    return; // Item processado pelo puzzle, não continuar
                }
            }

            // Se chegou aqui, o drop foi fora dos moldes mas o puzzle está ativo
            uiManager.showNotification('Solte o item em um dos moldes.', 2000);
            return;
        }

        // PRIORIDADE 2: Verificar se o item foi solto sobre uma parede
        const wallData = this.checkWallInteraction(worldX, worldY);

        if (wallData) {
            const requiredItem = wallData.requiredItem || 'gun';

            if (itemId === requiredItem) {
                // Item correto! Quebrar a parede
                this.handleWallInteraction(wallData, itemId);
            } else {
                // Item incorreto
                uiManager.showNotification(`Este item não funciona aqui. Você precisa de: ${requiredItem}`);
            }
        } else {
            // Não foi solto sobre uma parede
            uiManager.showNotification('Use o item em algo.', 2000);
        }
    }

    renderPadlockDigits(puzzle, visual, bgX, bgY, bgWidth, bgHeight) {
        // Limpar dígitos anteriores se existirem
        if (this.padlockDigitSprites) {
            this.padlockDigitSprites.forEach(sprite => {
                if (sprite.background) sprite.background.destroy();
                if (sprite.text) sprite.text.destroy();
            });
        }
        this.padlockDigitSprites = [];
        this.padlockCurrentCode = ['0', '0', '0', '0', '0'];

        // 🔍 DEBUG: Log para ver se digitPositions vem do banco
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 RENDERIZANDO CADEADO');
        console.log('   Puzzle ID:', puzzle.id);
        console.log('   Tem puzzle.digitPositions?', !!puzzle.digitPositions);
        if (puzzle.digitPositions) {
            console.log('   digitPositions do BANCO:', puzzle.digitPositions);
        } else {
            console.log('   ⚠️ Usando posições DEFAULT (não veio do banco)');
        }
        console.log('   visual.position:', visual.position);

        // Posição das caixinhas (pode ser configurada no editor)
        const digitPositions = puzzle.digitPositions || [
            { x: visual.position.x - 8, y: visual.position.y + 12 },
            { x: visual.position.x - 4, y: visual.position.y + 12 },
            { x: visual.position.x, y: visual.position.y + 12 },
            { x: visual.position.x + 4, y: visual.position.y + 12 },
            { x: visual.position.x + 8, y: visual.position.y + 12 }
        ];

        console.log('   digitPositions FINAL:', digitPositions);
        console.log('   DIMENSÕES DO FUNDO:');
        console.log('     bgWidth:', bgWidth, 'bgHeight:', bgHeight);
        console.log('     bgX:', bgX, 'bgY:', bgY);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const digitSize = puzzle.digitSize || { width: 40, height: 50 };

        digitPositions.forEach((pos, index) => {
            const worldX = bgX + (pos.x / 100) * bgWidth;
            const worldY = bgY + (pos.y / 100) * bgHeight;
            console.log(`   Dígito ${index}: ${pos.x}%, ${pos.y}% → worldX: ${worldX}, worldY: ${worldY}`);

            // Criar background (retângulo com borda)
            const background = this.add.graphics();
            background.fillStyle(0x000000, 0.8);
            background.fillRoundedRect(
                worldX - digitSize.width / 2,
                worldY - digitSize.height / 2,
                digitSize.width,
                digitSize.height,
                8
            );
            background.lineStyle(3, 0xf0a500, 1);
            background.strokeRoundedRect(
                worldX - digitSize.width / 2,
                worldY - digitSize.height / 2,
                digitSize.width,
                digitSize.height,
                8
            );
            background.setDepth(90);

            // Criar texto
            const text = this.add.text(worldX, worldY, '0', {
                fontSize: '28px',
                fontFamily: 'Arial',
                color: '#f0a500',
                fontStyle: 'bold'
            });
            text.setOrigin(0.5);
            text.setDepth(91);

            // Tornar interativo
            const hitArea = new Phaser.Geom.Rectangle(
                worldX - digitSize.width / 2,
                worldY - digitSize.height / 2,
                digitSize.width,
                digitSize.height
            );
            background.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            background.on('pointerover', () => {
                background.lineStyle(3, 0xffff00, 1);
                background.strokeRoundedRect(
                    worldX - digitSize.width / 2,
                    worldY - digitSize.height / 2,
                    digitSize.width,
                    digitSize.height,
                    8
                );
            });
            background.on('pointerout', () => {
                background.lineStyle(3, 0xf0a500, 1);
                background.strokeRoundedRect(
                    worldX - digitSize.width / 2,
                    worldY - digitSize.height / 2,
                    digitSize.width,
                    digitSize.height,
                    8
                );
            });
            background.on('pointerdown', (pointer, localX, localY, event) => {
                this.incrementPadlockDigit(index, puzzle);
                // Bloquear propagação para evitar zoom
                event.stopPropagation();
            });

            // Bloquear duplo clique para prevenir zoom
            background.on('pointerdblclick', (pointer, localX, localY, event) => {
                event.stopPropagation();
            });

            this.padlockDigitSprites.push({ background, text, index });
        });
    }

    incrementPadlockDigit(index, puzzle) {
        const currentDigit = parseInt(this.padlockCurrentCode[index]);
        const nextDigit = (currentDigit + 1) % 10;
        this.padlockCurrentCode[index] = nextDigit.toString();

        // Atualizar visualmente com animação de flip/giro
        if (this.padlockDigitSprites && this.padlockDigitSprites[index]) {
            const sprite = this.padlockDigitSprites[index];

            // Animação de flip vertical (como contador mecânico)
            this.tweens.add({
                targets: sprite.text,
                scaleY: 0,
                duration: 100,
                ease: 'Power2',
                onComplete: () => {
                    // Trocar o número no meio do flip
                    sprite.text.setText(nextDigit.toString());
                    // Voltar ao normal
                    this.tweens.add({
                        targets: sprite.text,
                        scaleY: 1,
                        duration: 100,
                        ease: 'Power2'
                    });
                }
            });

            // Pulso de cor na borda
            this.tweens.add({
                targets: sprite.background,
                alpha: 0.6,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }

        // Verificar se o código está correto
        this.checkPadlockCode(puzzle);
    }

    checkPadlockCode(puzzle) {
        const enteredCode = this.padlockCurrentCode.join('');
        const correctCode = puzzle.secretCode || '00000';

        if (enteredCode === correctCode) {
            // Código correto! Resolver o puzzle
            uiManager.showNotification('✅ Código correto! Cadeado destrancado!');

            // EXPLOSÃO dos dígitos! 💥
            if (this.padlockDigitSprites) {
                // Direções de explosão para cada dígito
                const explosionDirections = [
                    { x: -200, y: -150, rotation: -720 },  // Dígito 1: esquerda-cima
                    { x: -100, y: -200, rotation: -540 },  // Dígito 2: cima-esquerda
                    { x: 0, y: -250, rotation: 360 },      // Dígito 3: direto pra cima
                    { x: 100, y: -200, rotation: 540 },    // Dígito 4: cima-direita
                    { x: 200, y: -150, rotation: 720 }     // Dígito 5: direita-cima
                ];

                this.padlockDigitSprites.forEach((sprite, index) => {
                    const direction = explosionDirections[index];
                    const delay = index * 50; // Explosão escalonada

                    // Flash inicial
                    this.tweens.add({
                        targets: [sprite.background, sprite.text],
                        alpha: 0,
                        duration: 100,
                        yoyo: true,
                        repeat: 2,
                        delay: delay
                    });

                    // Explosão com rotação
                    setTimeout(() => {
                        const startX = sprite.text.x;
                        const startY = sprite.text.y;

                        this.tweens.add({
                            targets: [sprite.background, sprite.text],
                            x: startX + direction.x,
                            y: startY + direction.y,
                            alpha: 0,
                            scaleX: 2,
                            scaleY: 2,
                            duration: 800,
                            ease: 'Power3.easeOut',
                            onComplete: () => {
                                if (sprite.background) sprite.background.destroy();
                                if (sprite.text) sprite.text.destroy();
                            }
                        });

                        this.tweens.add({
                            targets: sprite.text,
                            angle: direction.rotation,
                            duration: 800,
                            ease: 'Power2'
                        });
                    }, delay + 200);
                });

                this.padlockDigitSprites = null;
            }

            // Resolver puzzle
            setTimeout(() => {
                gameStateManager.solvePuzzle(puzzle.id);
                this.updatePuzzleVisual(true);
            }, 1200);
        }
    }

    handlePuzzleUnlockedAction(puzzle) {
        const action = puzzle.onUnlockedAction;

        if (action.type === 'changeBackground') {
            // Trocar imagem de fundo
            const newBackgroundImage = action.newBackground;

            if (newBackgroundImage) {
                // Fazer fade out
                this.cameras.main.fadeOut(500, 0, 0, 0);

                this.cameras.main.once('camerafadeoutcomplete', () => {
                    // Atualizar dados da localização com novo background
                    this.locationData.image = newBackgroundImage;

                    // Destruir sprite do puzzle
                    if (this.puzzleSprite) {
                        this.puzzleSprite.destroy();
                        this.puzzleSprite = null;
                    }

                    // Re-renderizar background
                    if (this.background) {
                        this.background.destroy();
                    }
                    this.renderBackground();

                    // Fade in
                    this.cameras.main.fadeIn(500, 0, 0, 0);

                    // Mensagem customizada ou padrão
                    const message = action.message || 'O caminho se abriu!';
                    uiManager.showNotification(message);
                });
            }
        } else if (action.type === 'navigate') {
            // Navegar para outra localização
            const targetLocation = action.targetLocation;

            if (targetLocation) {
                // navigateToLocation já trata vídeo de transição e cena final
                this.navigateToLocation(targetLocation, { position: { x: 50, y: 50, width: 10, height: 10 } });
            }
        }
    }

    showStarWarsCredits() {
        const credits = this.locationData.credits || [];

        if (credits.length === 0) {
            return;
        }

        // Criar container de créditos com perspectiva 3D
        const creditsContainer = document.createElement('div');
        creditsContainer.id = 'star-wars-credits';
        creditsContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: 10000;
            overflow: hidden;
            perspective: 400px;
            perspective-origin: 50% 40%;
            pointer-events: none;
        `;

        // Container interno com a animação de perspectiva
        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 50%;
            width: 75%;
            text-align: center;
            transform-origin: 50% 0%;
            transform-style: preserve-3d;
            animation: starWarsScroll 60s linear forwards;
        `;

        // Adicionar cada texto com sua fonte
        credits.forEach(credit => {
            const textEl = document.createElement('div');
            textEl.style.cssText = `
                color: ${credit.color || '#feda4a'};
                font-family: ${credit.font || 'Arial, sans-serif'};
                font-size: ${credit.fontSize || '48px'};
                font-weight: ${credit.fontWeight || 'bold'};
                margin-bottom: 80px;
                line-height: 1.5;
                text-shadow: 0 0 10px rgba(254, 218, 74, 0.5);
                white-space: pre-wrap;
            `;
            textEl.textContent = credit.text;
            scrollContainer.appendChild(textEl);
        });

        creditsContainer.appendChild(scrollContainer);

        // Adicionar keyframes para animação
        if (!document.getElementById('star-wars-animation')) {
            const style = document.createElement('style');
            style.id = 'star-wars-animation';
            style.textContent = `
                @keyframes starWarsScroll {
                    0% {
                        transform: translateX(-50%) translateY(0) translateZ(200px) rotateX(50deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(-50%) translateY(-200%) translateZ(-2500px) rotateX(50deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(creditsContainer);

        // Após créditos terminarem, mostrar "THE END" e congelar jogo
        setTimeout(() => {
            // Remover os créditos em rolagem
            if (creditsContainer.parentNode) {
                creditsContainer.remove();
            }

            // Criar "THE END" no centro da tela
            const theEndContainer = document.createElement('div');
            theEndContainer.id = 'the-end-screen';
            theEndContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                pointer-events: none;
            `;

            const theEndText = document.createElement('div');
            theEndText.textContent = 'THE END';
            theEndText.style.cssText = `
                font-family: 'Georgia', serif;
                font-size: 120px;
                font-weight: bold;
                color: #feda4a;
                text-shadow:
                    0 0 20px rgba(254, 218, 74, 0.8),
                    0 0 40px rgba(254, 218, 74, 0.5),
                    4px 4px 10px rgba(0, 0, 0, 0.8);
                animation: theEndFadeIn 2s ease-in forwards;
                opacity: 0;
            `;

            theEndContainer.appendChild(theEndText);
            document.body.appendChild(theEndContainer);

            // Adicionar animação de fade-in para "THE END"
            if (!document.getElementById('the-end-animation')) {
                const style = document.createElement('style');
                style.id = 'the-end-animation';
                style.textContent = `
                    @keyframes theEndFadeIn {
                        0% {
                            opacity: 0;
                            transform: scale(0.5);
                        }
                        100% {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // CONGELAR TODOS OS CONTROLES DO JOGO
            this.gameFrozen = true;

            // Desabilitar input do Phaser
            this.input.enabled = false;

            // Remover interatividade de todos os hotspots e items
            this.input.off('pointerdown');
            this.input.off('pointermove');
            this.input.off('pointerup');

        }, 30000);
    }

    showDramaticMessages(messagesText, duration, onComplete) {
        // Substituir \n literal por quebra de linha real (caso o banco/JSON tenha escapado)
        const normalizedText = messagesText.replace(/\\n/g, '\n');

        // Dividir mensagens por linha
        const messages = normalizedText.split('\n').filter(msg => msg.trim());

        if (messages.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        // Fade out da cena atual
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Criar container de tela preta
            const container = document.createElement('div');
            container.id = 'dramatic-messages-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            `;

            // Elemento de texto
            const textElement = document.createElement('div');
            textElement.style.cssText = `
                color: #fff;
                font-family: 'Arial Black', Arial, sans-serif;
                font-size: 72px;
                font-weight: bold;
                text-align: center;
                text-transform: uppercase;
                padding: 40px;
                line-height: 1.3;
                text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
                max-width: 90%;
            `;

            container.appendChild(textElement);
            document.body.appendChild(container);

            let currentIndex = 0;

            const showNextMessage = () => {
                if (currentIndex >= messages.length) {
                    // Todas as mensagens exibidas
                    textElement.style.opacity = '0';
                    setTimeout(() => {
                        container.remove();
                        if (onComplete) onComplete();
                    }, 500);
                    return;
                }

                // Fade out da mensagem anterior
                textElement.style.opacity = '0';

                setTimeout(() => {
                    // Atualizar texto
                    textElement.textContent = messages[currentIndex];

                    // Fade in
                    textElement.style.opacity = '1';

                    currentIndex++;

                    // Esperar a duração configurada antes da próxima
                    setTimeout(showNextMessage, duration * 1000);
                }, 500); // Tempo do fade out
            };

            // Começar a exibir mensagens após um breve delay
            setTimeout(showNextMessage, 500);
        });
    }

    playTransitionVideo(videoPath, onComplete) {
        // Fade out da cena atual
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Criar container de vídeo full-screen
            const videoContainer = document.createElement('div');
            videoContainer.id = 'transition-video-container';
            videoContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #000;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            // Criar elemento de vídeo
            const videoElement = document.createElement('video');
            videoElement.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: contain;
            `;
            videoElement.src = videoPath;
            videoElement.autoplay = true;
            videoElement.controls = true;
            videoElement.preload = 'auto';

            videoElement.addEventListener('error', (e) => {
                console.error('❌ Erro no vídeo:', videoElement.error);

                // Mostrar mensagem e permitir continuar
                const errorMsg = document.createElement('div');
                errorMsg.style.cssText = 'color: white; font-size: 24px; text-align: center; padding: 20px;';
                errorMsg.textContent = 'Erro ao carregar vídeo. Clique para continuar.';
                videoContainer.appendChild(errorMsg);

                videoContainer.addEventListener('click', () => {
                    videoContainer.remove();
                    if (onComplete) onComplete();
                });
            });

            videoContainer.appendChild(videoElement);
            document.body.appendChild(videoContainer);

            // Tentar dar play explicitamente
            const playPromise = videoElement.play();

            if (playPromise !== undefined) {
                playPromise
                    .catch((error) => console.error('❌ Erro no play():', error));
            }

            // Quando o vídeo terminar
            videoElement.addEventListener('ended', () => {
                videoContainer.style.transition = 'opacity 500ms';
                videoContainer.style.opacity = '0';

                setTimeout(() => {
                    videoContainer.remove();
                    if (onComplete) {
                        onComplete();
                    }
                }, 500);
            });

            // Permitir pular o vídeo com clique
            videoContainer.addEventListener('click', () => {
                videoElement.pause();
                videoElement.currentTime = videoElement.duration;
            });
        });
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

        // Limpar sprites de dígitos do cadeado
        if (this.padlockDigitSprites) {
            this.padlockDigitSprites.forEach(sprite => {
                if (sprite.background) sprite.background.destroy();
                if (sprite.text) sprite.text.destroy();
            });
            this.padlockDigitSprites = null;
        }

        // Remover listener de resize
        this.scale.off('resize', this.handleResize, this);

        if (uiManager && typeof uiManager.closePuzzleOverlay === 'function') {
            uiManager.closePuzzleOverlay('scene-shutdown');
        }
    }
}
