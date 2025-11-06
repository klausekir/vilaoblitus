/**
 * Phaser Game Configuration
 * Configuração principal e inicialização do jogo
 */

console.log('🎮 Vila Abandonada - Phaser Edition');
console.log('📦 Carregando dados do jogo...');

// Configuração do Phaser
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    dom: {
        createContainer: true
    },
    scene: [BootScene, LocationScene]
};

// Inicializar jogo
let game;

async function initGame() {
    console.log('⏳ Aguardando carregamento do banco de dados...');

    // PRIMEIRO: Carregar dados do banco de dados
    try {
        await databaseLoader.loadGameData();
        console.log('✅ Dados carregados do banco!');
        console.log('📋 Locações carregadas:', Object.keys(GAME_MAP).length);
    } catch (error) {
        console.error('❌ Erro ao carregar do banco, usando map.js como fallback');
        console.log('📋 Locações carregadas (fallback):', Object.keys(GAME_MAP).length);
    }

    // DEPOIS: Inicializar Phaser
    game = new Phaser.Game(config);
    console.log('✓ Jogo inicializado');
}

// Iniciar quando página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
