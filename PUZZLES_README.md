# 🎮 Sistema de Puzzles - Codex Oblitus
## Inspirado em Blackthorn Castle

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tipos de Puzzles](#tipos-de-puzzles)
3. [Como Usar](#como-usar)
4. [Sistema de Fotografias](#sistema-de-fotografias)
5. [Exemplos Práticos](#exemplos-práticos)
6. [Personalização](#personalização)

---

## 🎯 Visão Geral

Sistema completo de puzzles para jogos point-and-click, incluindo:

✅ **5 tipos de puzzles** prontos para usar
✅ **Sistema de fotografias** para documentar pistas
✅ **Dicas progressivas** automáticas
✅ **Interface responsiva** e estilizada
✅ **Exemplos configuráveis** prontos

---

## 🧩 Tipos de Puzzles

### 1. 🔄 Discos Rotatórios (`rotating_discs`)

Discos concêntricos com símbolos que devem ser alinhados.

**Características:**
- 1-3 discos configuráveis
- 8-12 símbolos por disco
- Símbolos em emojis (substituíveis por imagens)
- Rotação ao clicar
- Verificação automática

**Exemplo de uso:**
```javascript
const puzzle = {
    type: 'rotating_discs',
    id: 'portao_mistico',
    title: 'Portão Místico',
    discs: 3,
    symbols: ['lua', 'sol', 'estrela', 'arvore', 'fogo', 'agua'],
    solution: ['lua', 'arvore', 'agua'], // Símbolos no topo
    onSolved: () => {
        gameStateManager.unlockLocation('caverna_secreta');
    }
};
```

---

### 2. 🔢 Código Numérico (`code`)

Fechadura com teclado numérico.

**Características:**
- 3-6 dígitos configuráveis
- Teclado numérico interativo
- Feedback visual
- Tentativas ilimitadas

**Exemplo de uso:**
```javascript
const puzzle = {
    type: 'code',
    id: 'cofre_mansion',
    title: 'Cofre Trancado',
    digits: 4,
    solution: '1847',
    hints: [
        { text: 'Procure datas em diários e lápides.' }
    ]
};
```

---

### 3. 🎯 Padrão de Símbolos (`pattern`)

Sequência de símbolos que deve ser pressionada na ordem correta.

**Características:**
- 4-8 símbolos disponíveis
- Sequência de 3-6 símbolos
- Feedback visual ao selecionar
- Reset automático se errar

**Exemplo de uso:**
```javascript
const puzzle = {
    type: 'pattern',
    id: 'porta_cripta',
    title: 'Porta da Cripta',
    symbols: ['corvo', 'lobo', 'serpente', 'dragao', 'aguia', 'leao'],
    solution: ['corvo', 'serpente', 'aguia', 'lobo'],
    hints: [
        { text: 'Observe o vitral da capela.' }
    ]
};
```

---

### 4. 🎛️ Fechadura com Botões (`sequence_buttons`)

Botões que movem barras que devem ser alinhadas no centro.

**Características:**
- 3-4 barras móveis
- 4-6 botões com efeitos diferentes
- Tolerância configurável
- Requer planejamento

**Exemplo de uso:**
```javascript
const puzzle = {
    type: 'sequence_buttons',
    id: 'fechadura_jardim',
    title: 'Fechadura Mecânica',
    elements: [
        {id: 'barra1', initialPos: 0, targetPos: 50},
        {id: 'barra2', initialPos: 100, targetPos: 50}
    ],
    buttons: [
        {id: 'btn1', moves: ['+10 barra1', '-5 barra2']},
        {id: 'btn2', moves: ['+5 barra1', '-10 barra2']}
    ],
    tolerance: 5
};
```

---

### 5. ⚙️ Combinação de Itens (`item_combination`)

**Já implementado no jogo base!** Use para puzzles de engrenagens e similares.

```javascript
const puzzle = {
    type: 'item_combination',
    id: 'mecanismo_torre',
    required_items: ['engrenagem_bronze', 'engrenagem_prata', 'engrenagem_ouro'],
    onSolved: () => {
        // Revelar passagem secreta
    }
};
```

---

## 📸 Sistema de Fotografias

### Como Funciona

Jogadores podem **fotografar pistas** importantes para consultar depois.

**Recursos:**
- Álbum de fotos consultável
- Fotos organizadas por localização
- Metadados (caption, clue data)
- Visualização em tamanho grande

### Como Adicionar Fotografia a um Hotspot

```javascript
hotspot: {
    id: 'vitral_capela',
    name: 'Vitral',
    photographable: true, // Permite fotografar
    photographImage: 'images/clues/vitral.jpg',
    photographCaption: 'Vitral com animais em ordem',
    clueData: {
        pattern: 'corvo → serpente → águia → lobo'
    }
}
```

### Tirar Fotografia Programaticamente

```javascript
gameStateManager.takePhotograph(
    'capela',                    // locationId
    'vitral',                    // objectId
    'images/clues/vitral.jpg',   // imageUrl
    'Vitral com padrão',         // caption
    { sequence: 'CSAL' }         // clueData opcional
);
```

### Abrir Álbum de Fotos

```javascript
photographAlbumUI.openAlbum();
```

---

## 💡 Como Usar

### Método 1: Via Hotspot (Recomendado)

Adicione ao mapa em `js/map.js`:

```javascript
hotspots: [
    {
        id: 'puzzle_portao',
        name: 'Portão Trancado',
        action: 'puzzle',  // Ação especial de puzzle
        puzzleConfig: {
            type: 'code',
            digits: 4,
            solution: '1847',
            title: 'Código do Portão'
        }
    }
]
```

### Método 2: Via Código na Scene

No `LocationScene.v2.js`:

```javascript
// Criar puzzle manager
this.puzzleManager = new PuzzleManager(this);

// Quando jogador clicar no hotspot
this.puzzleManager.createPuzzle({
    type: 'rotating_discs',
    discs: 3,
    solution: ['lua', 'sol', 'estrela']
});
```

### Método 3: Usar Exemplos Prontos

No arquivo `js/puzzle-examples.js` já existem 5 puzzles configurados:

```javascript
// Usar exemplo direto
puzzleManager.createPuzzle(PUZZLE_EXAMPLES.portao_mistico);
puzzleManager.createPuzzle(PUZZLE_EXAMPLES.cofre_mansion);
puzzleManager.createPuzzle(PUZZLE_EXAMPLES.porta_cripta);
```

---

## 🎨 Personalização

### Trocar Emojis por Imagens

Atualmente os símbolos usam emojis. Para usar imagens:

**1. Em `RotatingDiscsPuzzle.js`, linha ~20:**

```javascript
this.symbolLibrary = {
    'lua': '🌙',     // Emoji atual
    'sol': '☀️',
    // ...
};
```

**Altere para:**

```javascript
this.symbolLibrary = {
    'lua': 'images/symbols/lua.png',      // Caminho da imagem
    'sol': 'images/symbols/sol.png',
    // ...
};
```

**2. Altere a renderização (~linha 70):**

```javascript
// Ao invés de:
const text = this.scene.add.text(x, y, symbolEmoji, {...});

// Use:
const sprite = this.scene.add.image(x, y, symbolKey);
sprite.setDisplaySize(40, 40);
```

### Customizar Cores

No `PuzzleManager.js`, procure por `createModal()` e altere os estilos CSS:

```javascript
container.style.cssText = `
    background: #1a1a1a;        // Fundo do modal
    border: 2px solid #f0a500;  // Borda (cor dourada)
    // ...
`;
```

### Adicionar Sons

```javascript
onSolved: () => {
    this.scene.sound.play('success');  // Adicione sons aqui
    uiManager.showNotification('✅ Puzzle resolvido!');
}
```

---

## 🔍 Exemplos Práticos

### Exemplo Completo: Relógio da Igreja

```javascript
// 1. Adicionar pista fotografável na casa do padre
{
    id: 'diario_padre',
    name: 'Diário',
    photographable: true,
    photographImage: 'images/clues/diario.jpg',
    photographCaption: 'Diário do padre',
    clueData: {
        text: 'A tragédia começou às 3:47...'
    }
}

// 2. Adicionar puzzle na igreja
{
    id: 'relogio_igreja',
    name: 'Relógio da Torre',
    action: 'puzzle',
    puzzleConfig: {
        type: 'code',
        digits: 4,
        solution: '0347',
        title: 'Relógio Parado',
        hints: [
            { text: 'Procure o diário do padre.' }
        ],
        onSolved: () => {
            uiManager.showNotification('O sino badalou!');
            gameStateManager.unlockLocation('catacumbas');
        }
    }
}
```

---

## 🚀 Próximos Passos

1. **Adicionar puzzles aos locais existentes** no mapa
2. **Criar pistas fotografáveis** espalhadas pelo jogo
3. **Conectar puzzles** à progressão da história
4. **Substituir emojis por sprites** (quando estiverem prontos)
5. **Adicionar sons** de feedback
6. **Testar balanceamento** da dificuldade

---

## 📊 Estatísticas do Sistema

- ✅ **7 arquivos criados**
- ✅ **5 tipos de puzzles** funcionais
- ✅ **Sistema de fotografias** completo
- ✅ **Dicas progressivas** implementadas
- ✅ **5 exemplos** prontos para usar
- ✅ **100% TypeScript-free** (JavaScript puro)

---

## 🐛 Debug

### Testar Puzzle Diretamente no Console

```javascript
// Abrir console (F12) e executar:

// Teste 1: Puzzle de código
const pm = new PuzzleManager(game.scene.scenes[1]);
pm.createPuzzle({
    type: 'code',
    digits: 4,
    solution: '1234',
    title: 'Teste'
});

// Teste 2: Puzzle de padrão
pm.createPuzzle(PUZZLE_EXAMPLES.porta_cripta);

// Teste 3: Abrir álbum de fotos
photographAlbumUI.openAlbum();

// Teste 4: Tirar foto
gameStateManager.takePhotograph(
    'teste',
    'obj1',
    'images/floresta.jpg',
    'Teste de foto'
);
```

---

## ❓ FAQ

**P: Os puzzles salvam automaticamente?**
R: Sim! Quando resolvidos, são salvos via `gameStateManager.solvePuzzle()`.

**P: Posso ter múltiplos puzzles por localização?**
R: Sim! Basta adicionar múltiplos hotspots com action: 'puzzle'.

**P: Como faço puzzles dependentes (um libera outro)?**
R: Use `gameStateManager.isPuzzleSolved('id')` para verificar.

```javascript
if (gameStateManager.isPuzzleSolved('portao_mistico')) {
    // Liberar próximo puzzle
}
```

**P: Posso criar novos tipos de puzzles?**
R: Sim! Adicione no `PuzzleManager.js` seguindo o padrão dos existentes.

---

**🎮 Divirta-se criando puzzles incríveis!**

Baseado em: **Blackthorn Castle** por Syntaxity
Implementado para: **Codex Oblitus / Vila Abandonada**
Versão: **20250305**
