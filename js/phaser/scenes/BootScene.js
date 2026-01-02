/**
 * BootScene
 * Primeira cena - faz preload de todos os assets
 */
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    async preload() {
        // Loading bar UI
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

        // Title
        const title = this.add.text(width / 2, height / 2 - 100, 'Vila Abandonada', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#f0a500',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 20, 'Carregando dados do jogo...', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        loadingText.setOrigin(0.5);

        // Check if data was already loaded by config.js
        if (!databaseLoader.isLoaded()) {
            // Load game data from database (fallback if config.js didn't load)
            try {
                await databaseLoader.loadGameData();
                loadingText.setText('Carregando imagens...');
            } catch (error) {
                console.error('Failed to load game data:', error);
                loadingText.setText('Erro ao carregar dados!');
            }
        } else {
            loadingText.setText('Carregando imagens...');
        }

        // Progress bar background
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 + 20, 320, 30);

        // Progress text
        const percentText = this.add.text(width / 2, height / 2 + 35, '0%', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        percentText.setOrigin(0.5);

        const assetText = this.add.text(width / 2, height / 2 + 70, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        });
        assetText.setOrigin(0.5);

        // Update progress bar
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xf0a500, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 25, 300 * value, 20);
            percentText.setText(parseInt(value * 100) + '%');
        });

        this.load.on('fileprogress', (file) => {
            assetText.setText('Carregando: ' + file.key);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
        });

        // Tratamento de erro para assets que falham
        this.load.on('loaderror', (file) => {
            console.error('❌ Erro ao carregar:', file.key, file.url);
        });

        this.preloadOptimizedAssets();
    }

    preloadOptimizedAssets() {
        const gameMapData = databaseLoader.isLoaded() ? databaseLoader.gameMap : (typeof gameMap !== 'undefined' ? gameMap : {});

        // Determine start location (peek at Update localStorage to find where we are)
        let startLocationId = 'floresta';
        try {
            const saved = localStorage.getItem('vila_abandonada_phaser');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.currentLocation) {
                    startLocationId = state.currentLocation;
                }
            }
        } catch (e) {
            console.warn('Could not read start location from storage, defaulting to floresta');
        }

        console.log(`[BootScene] Lazy Loading: Preloading only start location: ${startLocationId}`);

        // Helper to load location assets
        const loadLocationAssets = (locationId) => {
            const location = gameMapData[locationId];
            if (!location) return;

            // Background
            const background = location.background || location.image;
            if (background && !this.textures.exists(locationId)) {
                this.load.image(locationId, background);
            }

            // Items in this location
            (location.items || []).forEach(item => {
                if (!item.id || !item.image) return;

                const textureKey = `item_${item.id}`;
                if (this.textures.exists(textureKey)) return;

                // ✅ Detectar formato de animação
                if (item.image.includes('_atlas.png')) {
                    // Texture atlas (PNG + JSON) - mais eficiente
                    const jsonPath = item.image.replace('.png', '.json');
                    this.load.atlas(textureKey, item.image, jsonPath);
                } else if (item.image.includes('_spritesheet.png')) {
                    // Spritesheet simples (grid regular)
                    const frameWidth = item.spritesheetFrameWidth || 249; // Default ou customizado
                    const frameHeight = item.spritesheetFrameHeight || 341;

                    this.load.spritesheet(textureKey, item.image, {
                        frameWidth: frameWidth,
                        frameHeight: frameHeight
                    });
                } else if (item.isDecorative) {
                    // Itens decorativos com GIF - pular (usar DOM)
                    return;
                } else {
                    // Itens normais - carregar como imagem estática
                    this.load.image(textureKey, item.image);
                }
            });

            // Puzzle visuals
            if (location.puzzle && location.puzzle.visual) {
                const visual = location.puzzle.visual;
                if (visual.beforeImage && !this.textures.exists(`puzzle_${locationId}_before`)) {
                    this.load.image(`puzzle_${locationId}_before`, visual.beforeImage);
                }
                if (visual.afterImage && !this.textures.exists(`puzzle_${locationId}_after`)) {
                    this.load.image(`puzzle_${locationId}_after`, visual.afterImage);
                }
            }

            // Puzzle reward
            const rewardId = location.puzzle?.reward?.id;
            if (rewardId) {
                const rewardImage = location.puzzle.reward.image || `images/items/${rewardId}.png`;
                if (!this.textures.exists(`puzzle_reward_${rewardId}`)) {
                    this.load.image(`puzzle_reward_${rewardId}`, rewardImage);
                }
            }
        };

        // Load ONLY the start location
        loadLocationAssets(startLocationId);

        // Load static/global assets (always needed)
        this.load.image('projectile_bullet', 'images/effects/bullet.png');
        this.load.image('wall_texture', 'images/objects/wall_texture.png');
        
        // Load common UI items if needed (example: generic icons not part of location)
        // ...
    }

    async create() {
        // Inicializar game state e carregar progresso
        await gameStateManager.init();

        // Transição para a primeira cena
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('LocationScene', {
                locationId: gameStateManager.getState().currentLocation
            });
        });
    }
}
