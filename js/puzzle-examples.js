/**
 * Exemplos de Configuração de Puzzles
 * Inspire-se nestes exemplos para criar seus próprios puzzles
 */

const PUZZLE_EXAMPLES = {
    /**
     * PUZZLE 1: Discos Rotatórios - Portão Místico
     * Local sugerido: Entrada da vila ou floresta
     */
    portao_mistico: {
        id: 'portao_mistico',
        type: 'rotating_discs',
        title: 'Portão Místico',
        description: 'Três discos de pedra com símbolos antigos. Alinhe-os corretamente.',
        discs: 3,
        symbols: ['lua', 'sol', 'estrela', 'arvore', 'fogo', 'agua', 'terra', 'vento'],
        solution: ['lua', 'arvore', 'agua'], // Símbolos que devem ficar no topo
        hints: [
            { text: 'Procure por símbolos semelhantes nas paredes da caverna.' },
            { text: 'A lua sobre a árvore, a água sob tudo.' }
        ],
        autoHints: true,
        onSolved: () => {
            uiManager.showNotification('O portão se abre com um rangido...');
            // Desbloquear nova área
            // gameStateManager.unlockLocation('caverna_secreta');
        }
    },

    /**
     * PUZZLE 2: Código Numérico - Cofre da Mansão
     * Local sugerido: Mansão ou casa abandonada
     */
    cofre_mansion: {
        id: 'cofre_mansion',
        type: 'code',
        title: 'Cofre Trancado',
        description: 'Um cofre antigo com fechadura numérica de 4 dígitos.',
        digits: 4,
        solution: '1847',
        hints: [
            { text: 'Procure datas importantes em diários e lápides.' },
            { text: 'O ano em que a família fundadora chegou aqui: 1847' }
        ],
        photographable: true, // Permite fotografar o cofre como pista
        onSolved: () => {
            uiManager.showNotification('O cofre se abre revelando uma chave antiga!');
            // Adicionar recompensa
            gameStateManager.collectItem({
                id: 'chave_antiga',
                name: 'Chave Antiga',
                description: 'Uma chave enferrujada, mas ainda funcional.',
                image: 'images/items/chave_antiga.png'
            });
        }
    },

    /**
     * PUZZLE 3: Padrão de Símbolos - Porta da Cripta
     * Local sugerido: Cemitério ou cripta
     */
    porta_cripta: {
        id: 'porta_cripta',
        type: 'pattern',
        title: 'Porta da Cripta',
        description: 'Símbolos gravados brilham ao toque. Qual é a sequência correta?',
        symbols: ['corvo', 'lobo', 'serpente', 'dragao', 'aguia', 'leao'],
        solution: ['corvo', 'serpente', 'aguia', 'lobo'],
        hints: [
            { text: 'Observe o vitral da capela com atenção.' },
            { text: 'No vitral: corvo no topo, serpente à esquerda, águia à direita, lobo embaixo.' }
        ],
        photographable: true,
        clueData: { // Dados que aparecem na foto
            pattern: 'CSAL',
            meaning: 'Corvo, Serpente, Águia, Lobo'
        },
        onSolved: () => {
            uiManager.showNotification('A porta range e se abre lentamente...');
        }
    },

    /**
     * PUZZLE 4: Fechadura com Botões - Portão do Jardim
     * Local sugerido: Jardim ou portão secundário
     */
    fechadura_jardim: {
        id: 'fechadura_jardim',
        type: 'sequence_buttons',
        title: 'Fechadura Mecânica',
        description: 'Alinhe todas as barras no centro pressionando os botões.',
        elements: [
            {id: 'barra1', initialPos: 0, targetPos: 50},
            {id: 'barra2', initialPos: 100, targetPos: 50},
            {id: 'barra3', initialPos: 25, targetPos: 50},
            {id: 'barra4', initialPos: 75, targetPos: 50}
        ],
        buttons: [
            {id: 'btn1', moves: ['+10 barra1', '-5 barra2']},
            {id: 'btn2', moves: ['+5 barra3', '-10 barra4']},
            {id: 'btn3', moves: ['+15 barra2', '+5 barra4']},
            {id: 'btn4', moves: ['-10 barra1', '-5 barra3']}
        ],
        tolerance: 5,
        hints: [
            { text: 'Experimente combinações diferentes de botões.' },
            { text: 'Solução: Botão 1 (1x), Botão 3 (2x), Botão 2 (1x), Botão 4 (1x)' }
        ],
        onSolved: () => {
            uiManager.showNotification('A fechadura se destranca com um clique!');
        }
    },

    /**
     * PUZZLE 5: Relógio da Igreja
     * Tipo customizado - código com tema de relógio
     */
    relogio_igreja: {
        id: 'relogio_igreja',
        type: 'code',
        title: 'Relógio Parado',
        description: 'O relógio da torre parou. Digite a hora exata do evento.',
        digits: 4,
        solution: '0347', // 03:47
        hints: [
            { text: 'Leia o diário do padre na casa paroquial.' },
            { text: 'No diário: "A tragédia começou às 3:47 da madrugada..."' }
        ],
        onSolved: () => {
            uiManager.showNotification('O sino da torre badalaainda que quebrado...');
            uiManager.showNotification('Uma passagem secreta se revela atrás do altar!');
        }
    }
};

/**
 * COMO USAR:
 *
 * 1. Na LocationScene, adicione um hotspot com action: 'puzzle'
 *
 * hotspot: {
 *     id: 'portao_mistico_hotspot',
 *     action: 'puzzle',
 *     puzzleConfig: PUZZLE_EXAMPLES.portao_mistico
 * }
 *
 * 2. Ou crie diretamente no código:
 *
 * const puzzleManager = new PuzzleManager(this);
 * puzzleManager.createPuzzle(PUZZLE_EXAMPLES.cofre_mansion);
 *
 * 3. Para puzzles que requerem itens (engrenagens):
 *
 * puzzle: {
 *     type: 'item_combination', // Use o tipo existente
 *     required_items: ['engrenagem_bronze', 'engrenagem_prata']
 * }
 */

// Exemplos de hotspots fotografáveis
const PHOTOGRAPHABLE_CLUES = {
    vitral_capela: {
        id: 'vitral_capela',
        photographable: true,
        photographImage: 'images/clues/vitral.jpg',
        photographCaption: 'Vitral com animais em ordem específica',
        clueData: {
            animals: ['corvo', 'serpente', 'aguia', 'lobo'],
            positions: 'Topo, Esquerda, Direita, Baixo'
        }
    },

    diario_padre: {
        id: 'diario_padre',
        photographable: true,
        photographImage: 'images/clues/diario.jpg',
        photographCaption: 'Página do diário do padre',
        clueData: {
            text: 'A tragédia começou às 3:47 da madrugada...',
            code: '0347'
        }
    },

    lapide_fundador: {
        id: 'lapide_fundador',
        photographable: true,
        photographImage: 'images/clues/lapide.jpg',
        photographCaption: 'Lápide de Cornelius, fundador da vila',
        clueData: {
            text: 'Aqui jaz Cornelius - 1847-1923',
            birthYear: '1847'
        }
    }
};
