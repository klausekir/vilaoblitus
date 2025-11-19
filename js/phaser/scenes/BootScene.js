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
            console.log('✓ Dados já carregados, pulando para imagens...');
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

        const backgroundSources = new Map();
        const itemSources = new Map();
        const puzzleBeforeSources = new Map();
        const puzzleAfterSources = new Map();
        const rewardSources = new Map();

        Object.keys(gameMapData).forEach(locationId => {
            const location = gameMapData[locationId];

            const background = location.background || location.image;
            if (background && !backgroundSources.has(locationId)) {
                backgroundSources.set(locationId, background);
            }

            (location.items || []).forEach(item => {
                if (item.id && item.image && !itemSources.has(item.id)) {
                    itemSources.set(item.id, item.image);
                }
            });

            if (location.puzzle && location.puzzle.visual) {
                const visual = location.puzzle.visual;
                if (visual.beforeImage && !puzzleBeforeSources.has(locationId)) {
                    puzzleBeforeSources.set(locationId, visual.beforeImage);
                }
                if (visual.afterImage && !puzzleAfterSources.has(locationId)) {
                    puzzleAfterSources.set(locationId, visual.afterImage);
                }
            }

            const rewardId = location.puzzle?.reward?.id;
            if (rewardId) {
                const rewardImage = location.puzzle.reward.image || `images/items/${rewardId}.png`;
                if (!rewardSources.has(rewardId)) {
                    rewardSources.set(rewardId, rewardImage);
                }
            }
        });

        backgroundSources.forEach((src, key) => this.load.image(key, src));
        itemSources.forEach((src, id) => this.load.image(`item_${id}`, src));
        puzzleBeforeSources.forEach((src, id) => this.load.image(`puzzle_${id}_before`, src));
        puzzleAfterSources.forEach((src, id) => this.load.image(`puzzle_${id}_after`, src));
        rewardSources.forEach((src, id) => this.load.image(`puzzle_reward_${id}`, src));

        // Load static assets
        this.load.image('projectile_bullet', 'images/effects/bullet.png');
        this.load.image('wall_texture', 'images/objects/wall_texture.png');
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
