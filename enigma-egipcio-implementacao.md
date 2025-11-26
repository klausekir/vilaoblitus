# Enigma Egípcio - Documentação Completa

## Visão Geral

Sistema de puzzle com 6 peças hexagonais rotatórias contendo símbolos egípcios. O jogador clica nas peças para rotacioná-las até que todos os símbolos estejam na orientação correta.

## Estrutura de Dados

### Configuração do Puzzle

```javascript
{
  id: 'parede_egipcia',
  type: 'egyptian',
  title: 'Parede Egípcia Antiga',
  description: 'Símbolos egípcios gravados na parede. Rotacione cada peça até a posição correta.',
  pieces: [
    {
      id: 'piece1',
      symbol: 'ankh',           // ☥
      initialRotation: 0,       // Rotação inicial (0, 90, 180, 270)
      correctRotation: 0,       // Rotação correta
      position: { x: -150, y: -80 }
    },
    {
      id: 'piece2',
      symbol: 'eye',            // 𓂀
      initialRotation: 90,
      correctRotation: 0,
      position: { x: 0, y: -80 }
    },
    {
      id: 'piece3',
      symbol: 'scarab',         // 🪲
      initialRotation: 180,
      correctRotation: 90,
      position: { x: 150, y: -80 }
    },
    {
      id: 'piece4',
      symbol: 'sun',            // ☀️
      initialRotation: 0,
      correctRotation: 180,
      position: { x: -150, y: 80 }
    },
    {
      id: 'piece5',
      symbol: 'bird',           // 𓅃
      initialRotation: 270,
      correctRotation: 270,
      position: { x: 0, y: 80 }
    },
    {
      id: 'piece6',
      symbol: 'snake',          // 🐍
      initialRotation: 90,
      correctRotation: 0,
      position: { x: 150, y: 80 }
    }
  ],
  hints: [
    { text: 'Procure os papiros antigos espalhados pela câmara que mostram as orientações corretas.' },
    { text: 'Pista: Ankh para cima, Olho para cima, Escaravelho para direita, Sol invertido, Pássaro para esquerda, Serpente para cima.' }
  ],
  reward: {
    id: 'amuleto_egito',
    name: 'Amuleto Egípcio',
    description: 'Um amuleto antigo com poderes místicos',
    image: 'images/items/amuleto_egito.png'
  }
}
```

## Código do Puzzle (EgyptianPuzzle.js)

```javascript
/**
 * EgyptianPuzzle.js
 * Puzzle de parede egípcia com peças hexagonais rotatórias
 */

class EgyptianPuzzle {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.container = null;
        this.puzzlePieces = [];
        this.solved = false;

        // Símbolos egípcios
        this.egyptianSymbols = {
            'ankh': '☥',
            'eye': '𓂀',
            'scarab': '🪲',
            'sun': '☀️',
            'bird': '𓅃',
            'snake': '🐍'
        };

        // Configuração padrão das peças
        this.puzzlePieces = config.pieces || [
            { id: 'piece1', symbol: 'ankh', initialRotation: 0, correctRotation: 0, position: { x: -150, y: -80 } },
            { id: 'piece2', symbol: 'eye', initialRotation: 90, correctRotation: 0, position: { x: 0, y: -80 } },
            { id: 'piece3', symbol: 'scarab', initialRotation: 180, correctRotation: 90, position: { x: 150, y: -80 } },
            { id: 'piece4', symbol: 'sun', initialRotation: 0, correctRotation: 180, position: { x: -150, y: 80 } },
            { id: 'piece5', symbol: 'bird', initialRotation: 270, correctRotation: 270, position: { x: 0, y: 80 } },
            { id: 'piece6', symbol: 'snake', initialRotation: 90, correctRotation: 0, position: { x: 150, y: 80 } }
        ];
    }

    create(x, y) {
        this.container = this.scene.add.container(x, y);
        this.container.setDepth(1000);

        // Fundo da parede
        const wallBg = this.scene.add.rectangle(0, 0, 500, 300, 0x3d2817);
        wallBg.setStrokeStyle(4, 0xd4af37);
        this.container.add(wallBg);

        // Título
        const title = this.scene.add.text(0, -180, this.config.title || 'Parede Egípcia', {
            fontSize: '32px',
            fontFamily: 'Georgia',
            color: '#f0a500',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        this.container.add(title);

        // Descrição
        const desc = this.scene.add.text(0, -140, this.config.description || 'Rotacione as peças até a posição correta', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: 400 }
        });
        desc.setOrigin(0.5);
        this.container.add(desc);

        // Criar as peças
        this.puzzlePieces.forEach(pieceData => {
            const piece = this.createPiece(pieceData);
            this.container.add(piece.hexagon);
            this.container.add(piece.symbolText);
            this.container.add(piece.indicator);
        });

        // Botão fechar
        const closeBtn = this.scene.add.text(220, -180, '✕', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#cc0000',
            padding: { x: 10, y: 5 }
        });
        closeBtn.setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.close());
        this.container.add(closeBtn);

        return this.container;
    }

    createPiece(pieceData) {
        const { position, symbol, initialRotation, correctRotation } = pieceData;

        // Hexágono
        const hexagon = this.scene.add.graphics();
        hexagon.fillStyle(0x8b6f47, 1);
        hexagon.lineStyle(2, 0xd4af37, 1);

        const size = 60;
        const angle = Math.PI / 3; // 60 graus
        hexagon.beginPath();
        for (let i = 0; i < 6; i++) {
            const px = position.x + size * Math.cos(angle * i);
            const py = position.y + size * Math.sin(angle * i);
            if (i === 0) hexagon.moveTo(px, py);
            else hexagon.lineTo(px, py);
        }
        hexagon.closePath();
        hexagon.fillPath();
        hexagon.strokePath();

        // Símbolo egípcio
        const symbolText = this.scene.add.text(
            position.x,
            position.y,
            this.egyptianSymbols[symbol] || symbol,
            {
                fontSize: '48px',
                color: '#f0a500'
            }
        );
        symbolText.setOrigin(0.5);
        symbolText.setAngle(initialRotation);

        // Indicador de orientação (pequeno triângulo no topo)
        const indicator = this.scene.add.triangle(
            position.x,
            position.y - 35,
            0, 0,
            5, 10,
            -5, 10,
            0xd4af37
        );
        indicator.setAngle(initialRotation);

        // Tornar interativo
        const hitArea = new Phaser.Geom.Circle(position.x, position.y, size);
        hexagon.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        hexagon.on('pointerdown', () => {
            if (!this.solved) {
                this.rotatePiece({
                    ...pieceData,
                    hexagon,
                    symbolText,
                    indicator,
                    currentRotation: symbolText.angle
                });
            }
        });

        pieceData.hexagon = hexagon;
        pieceData.symbolText = symbolText;
        pieceData.indicator = indicator;
        pieceData.currentRotation = initialRotation;

        return pieceData;
    }

    rotatePiece(piece) {
        // Rotacionar 90 graus no sentido horário
        piece.currentRotation = (piece.currentRotation + 90) % 360;

        this.scene.tweens.add({
            targets: [piece.symbolText, piece.indicator],
            angle: piece.currentRotation,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.checkSolution();
            }
        });

        // Som de clique
        // this.scene.sound.play('click');
    }

    checkSolution() {
        const allCorrect = this.puzzlePieces.every(piece => {
            return piece.currentRotation === piece.correctRotation;
        });

        if (allCorrect && !this.solved) {
            this.onSolved();
        }
    }

    onSolved() {
        this.solved = true;
        console.log('✅ Puzzle Egípcio resolvido!');

        // Flash dourado em todas as peças
        this.puzzlePieces.forEach(piece => {
            this.scene.tweens.add({
                targets: piece.symbolText,
                alpha: { from: 1, to: 0.3 },
                duration: 200,
                yoyo: true,
                repeat: 3
            });
        });

        // Tremor da parede
        this.scene.tweens.add({
            targets: this.container,
            x: this.container.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 10,
            onComplete: () => {
                this.animateWallOpening();
            }
        });
    }

    animateWallOpening() {
        // Partículas de poeira dourada
        const particles = this.scene.add.particles(0, 0, 'wall_texture', {
            speed: { min: -100, max: 100 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 2,
            blendMode: 'ADD',
            tint: 0xd4af37
        });
        particles.setDepth(999);
        this.container.add(particles);

        setTimeout(() => {
            particles.stop();
        }, 2000);

        // Callback de sucesso
        if (this.config.onSolved) {
            setTimeout(() => {
                this.config.onSolved();
                this.close();
            }, 2500);
        }
    }

    close() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    destroy() {
        this.close();
    }
}
```

## Integração com PuzzleManager

### Adicionar no PuzzleManager.js

```javascript
// No método createPuzzle(), adicionar case:
case 'egyptian':
    return this.createEgyptianPuzzle(config);

// Adicionar método:
createEgyptianPuzzle(config) {
    const puzzle = new EgyptianPuzzle(this.scene, config);
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    puzzle.create(centerX, centerY);
    this.activePuzzle = puzzle;
    this.addHintButtonToContainer(puzzle.container, config);
    this.startHintTimer(config);

    return puzzle;
}
```

### Adicionar no LocationScene.v2.js

```javascript
// Lista de puzzles do PuzzleManager (linha ~1674)
const phaserPuzzleTypes = ['egyptian', 'rotating_discs', 'pattern', 'sequence_buttons'];

if (phaserPuzzleTypes.includes(puzzleType)) {
    console.log('[PUZZLE]', 'abrindo puzzle do PuzzleManager', puzzleType);

    if (!this.puzzleManager) {
        this.puzzleManager = new PuzzleManager(this);
    }

    const puzzleConfig = {
        ...puzzle,
        onSolved: () => {
            gameStateManager.solvePuzzle(puzzle.id);
            uiManager.showNotification('✅ Enigma resolvido!');

            if (puzzle.reward) {
                setTimeout(() => {
                    gameStateManager.collectItem(puzzle.reward);
                    uiManager.showNotification(`Você ganhou: ${puzzle.reward.name}`);
                }, 1500);
            }

            setTimeout(() => this.updatePuzzleVisual(), 2000);
        }
    };

    this.puzzleManager.createPuzzle(puzzleConfig);
    this.flashPuzzleSprite(0xf0a500);
    return;
}
```

## Adicionar ao Editor

### 1. Botão no Menu de Enigmas (location-editor-db.html ~linha 739)

```html
<div class="puzzle-type-btn" onclick="selectPuzzleType('egyptian')">
    <div>𓂀 Parede Egípcia</div>
    <small>Rotacionar peças</small>
</div>
```

### 2. Template do Formulário (location-editor-db.html ~linha 3416)

```javascript
egyptian: `
    <div class="form-group">
        <label>Título</label>
        <input type="text" id="puzzle-title" placeholder="Parede Egípcia Antiga" onchange="savePuzzle()">
    </div>
    <div class="form-group">
        <label>Descrição</label>
        <textarea id="puzzle-description" placeholder="Símbolos egípcios gravados na parede..." onchange="savePuzzle()"></textarea>
    </div>
    <div class="form-group">
        <label>Dicas (JSON array)</label>
        <textarea id="puzzle-hints" placeholder='[{"text": "Procure os papiros..."}]' onchange="savePuzzle()"></textarea>
        <div class="form-hint">Use o template de exemplo da Câmara Secreta</div>
    </div>
`
```

### 3. Função de Salvamento (location-editor-db.html ~linha 3600)

```javascript
else if (currentPuzzleType === 'egyptian' || currentPuzzleType === 'rotating_discs' ||
         currentPuzzleType === 'pattern' || currentPuzzleType === 'sequence_buttons') {
    // Campos comuns
    const titleEl = document.getElementById('puzzle-title');
    if (titleEl && titleEl.value) puzzle.title = titleEl.value;

    const descEl = document.getElementById('puzzle-description');
    if (descEl && descEl.value) puzzle.description = descEl.value;

    const hintsEl = document.getElementById('puzzle-hints');
    if (hintsEl && hintsEl.value) {
        try {
            puzzle.hints = JSON.parse(hintsEl.value);
        } catch (e) {
            console.warn('Hints inválidos, usando array vazio:', e);
            puzzle.hints = [];
        }
    }
}
```

### 4. Função de Carregamento (location-editor-db.html ~linha 3524)

```javascript
else if (puzzle.type === 'egyptian' || puzzle.type === 'rotating_discs' ||
         puzzle.type === 'pattern' || puzzle.type === 'sequence_buttons') {
    const titleEl = document.getElementById('puzzle-title');
    if (titleEl && puzzle.title) titleEl.value = puzzle.title;

    const descEl = document.getElementById('puzzle-description');
    if (descEl && puzzle.description) descEl.value = puzzle.description;

    const hintsEl = document.getElementById('puzzle-hints');
    if (hintsEl && puzzle.hints) {
        hintsEl.value = JSON.stringify(puzzle.hints, null, 2);
    }
}
```

### 5. Nome do Tipo (location-editor-db.html ~linha 3543)

```javascript
function getPuzzleTypeName(type) {
    const names = {
        // ... outros tipos
        egyptian: 'Parede Egípcia',
        rotating_discs: 'Discos',
        pattern: 'Padrão',
        sequence_buttons: 'Fechadura'
    };
    return names[type] || type;
}
```

## Criação de Location com Puzzle Egípcio

### SQL Script (sql/add-egyptian-puzzle.sql)

```sql
-- Inserir locação
INSERT INTO locations (id, name, description, background_image, created_at, updated_at)
VALUES (
    'camara_secreta',
    'Câmara Secreta',
    'Uma câmara antiga coberta de hieróglifos e símbolos egípcios. No centro da sala, uma parede de pedra com seis peças hexagonais que parecem poder ser rotacionadas.',
    'images/camara_secreta.jpg',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    background_image = VALUES(background_image),
    updated_at = NOW();

-- Adicionar puzzle
INSERT INTO location_puzzles (location_id, puzzle_id, puzzle_data)
VALUES (
    'camara_secreta',
    'parede_egipcia',
    JSON_OBJECT(
        'id', 'parede_egipcia',
        'type', 'egyptian',
        'title', 'Parede Egípcia Antiga',
        'description', 'Símbolos egípcios gravados na parede. Rotacione cada peça até a posição correta.',
        'pieces', JSON_ARRAY(
            JSON_OBJECT('id', 'piece1', 'symbol', 'ankh', 'initialRotation', 0, 'correctRotation', 0, 'position', JSON_OBJECT('x', -150, 'y', -80)),
            JSON_OBJECT('id', 'piece2', 'symbol', 'eye', 'initialRotation', 90, 'correctRotation', 0, 'position', JSON_OBJECT('x', 0, 'y', -80)),
            JSON_OBJECT('id', 'piece3', 'symbol', 'scarab', 'initialRotation', 180, 'correctRotation', 90, 'position', JSON_OBJECT('x', 150, 'y', -80)),
            JSON_OBJECT('id', 'piece4', 'symbol', 'sun', 'initialRotation', 0, 'correctRotation', 180, 'position', JSON_OBJECT('x', -150, 'y', 80)),
            JSON_OBJECT('id', 'piece5', 'symbol', 'bird', 'initialRotation', 270, 'correctRotation', 270, 'position', JSON_OBJECT('x', 0, 'y', 80)),
            JSON_OBJECT('id', 'piece6', 'symbol', 'snake', 'initialRotation', 90, 'correctRotation', 0, 'position', JSON_OBJECT('x', 150, 'y', 80))
        ),
        'hints', JSON_ARRAY(
            JSON_OBJECT('text', 'Procure os papiros antigos espalhados pela câmara que mostram as orientações corretas.'),
            JSON_OBJECT('text', 'Pista: Ankh para cima, Olho para cima, Escaravelho para direita, Sol invertido, Pássaro para esquerda, Serpente para cima.')
        ),
        'reward', JSON_OBJECT(
            'id', 'amuleto_egito',
            'name', 'Amuleto Egípcio',
            'description', 'Um amuleto antigo com poderes místicos',
            'image', 'images/items/amuleto_egito.png'
        )
    )
) ON DUPLICATE KEY UPDATE
    puzzle_id = VALUES(puzzle_id),
    puzzle_data = VALUES(puzzle_data),
    updated_at = CURRENT_TIMESTAMP;
```

### PHP API (api/locations/add-egyptian-puzzle.php)

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';
$pdo = getDBConnection();

try {
    $pdo->beginTransaction();

    // 1. Inserir locação
    $stmt = $pdo->prepare("
        INSERT INTO locations (id, name, description, background_image, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            background_image = VALUES(background_image),
            updated_at = NOW()
    ");

    $stmt->execute([
        'camara_secreta',
        'Câmara Secreta',
        'Uma câmara antiga coberta de hieróglifos e símbolos egípcios.',
        'images/camara_secreta.jpg'
    ]);

    // 2. Adicionar puzzle
    $puzzleData = [
        'id' => 'parede_egipcia',
        'type' => 'egyptian',
        'title' => 'Parede Egípcia Antiga',
        'description' => 'Símbolos egípcios gravados na parede. Rotacione cada peça até a posição correta.',
        'pieces' => [
            ['id' => 'piece1', 'symbol' => 'ankh', 'initialRotation' => 0, 'correctRotation' => 0, 'position' => ['x' => -150, 'y' => -80]],
            ['id' => 'piece2', 'symbol' => 'eye', 'initialRotation' => 90, 'correctRotation' => 0, 'position' => ['x' => 0, 'y' => -80]],
            ['id' => 'piece3', 'symbol' => 'scarab', 'initialRotation' => 180, 'correctRotation' => 90, 'position' => ['x' => 150, 'y' => -80]],
            ['id' => 'piece4', 'symbol' => 'sun', 'initialRotation' => 0, 'correctRotation' => 180, 'position' => ['x' => -150, 'y' => 80]],
            ['id' => 'piece5', 'symbol' => 'bird', 'initialRotation' => 270, 'correctRotation' => 270, 'position' => ['x' => 0, 'y' => 80]],
            ['id' => 'piece6', 'symbol' => 'snake', 'initialRotation' => 90, 'correctRotation' => 0, 'position' => ['x' => 150, 'y' => 80]]
        ],
        'hints' => [
            ['text' => 'Procure os papiros antigos espalhados pela câmara que mostram as orientações corretas.'],
            ['text' => 'Pista: Ankh para cima, Olho para cima, Escaravelho para direita, Sol invertido, Pássaro para esquerda, Serpente para cima.']
        ],
        'reward' => [
            'id' => 'amuleto_egito',
            'name' => 'Amuleto Egípcio',
            'description' => 'Um amuleto antigo com poderes místicos',
            'image' => 'images/items/amuleto_egito.png'
        ]
    ];

    $stmt = $pdo->prepare("
        INSERT INTO location_puzzles (location_id, puzzle_id, puzzle_data)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            puzzle_id = VALUES(puzzle_id),
            puzzle_data = VALUES(puzzle_data),
            updated_at = CURRENT_TIMESTAMP
    ");

    $stmt->execute([
        'camara_secreta',
        'parede_egipcia',
        json_encode($puzzleData)
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Câmara Secreta com Puzzle Egípcio criada com sucesso!',
        'data' => [
            'location_id' => 'camara_secreta',
            'puzzle_id' => 'parede_egipcia'
        ]
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar locação: ' . $e->getMessage()
    ]);
}
?>
```

## Estrutura do Banco de Dados

**NÃO É NECESSÁRIO** alterar o banco! A estrutura atual já suporta o puzzle egípcio:

```sql
CREATE TABLE location_puzzles (
    location_id VARCHAR(50) PRIMARY KEY,
    puzzle_id VARCHAR(100) NOT NULL,
    puzzle_data LONGTEXT NOT NULL,  -- JSON completo do puzzle
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

O campo `puzzle_data` armazena todo o JSON do puzzle, incluindo os novos campos (title, description, hints, pieces).

## Arquivos Necessários

1. **js/phaser/puzzles/EgyptianPuzzle.js** - Classe do puzzle
2. **Modificações em js/phaser/puzzles/PuzzleManager.js** - Adicionar case 'egyptian'
3. **Modificações em js/phaser/scenes/LocationScene.v2.js** - Reconhecer tipo 'egyptian'
4. **Modificações em location-editor-db.html** - Botão, template, save/load
5. **sql/add-egyptian-puzzle.sql** - Script SQL opcional
6. **api/locations/add-egyptian-puzzle.php** - API opcional
7. **add-egyptian-location.html** - Interface opcional

## Carregamento no HTML Principal

```html
<!-- game-phaser.html -->
<script src="js/phaser/puzzles/EgyptianPuzzle.js?v=20250307"></script>
<script src="js/phaser/puzzles/PuzzleManager.js?v=20250307"></script>
```

## Notas Importantes

- O puzzle usa apenas símbolos Unicode/Emoji (sem necessidade de assets gráficos)
- Totalmente responsivo e adaptável a diferentes resoluções
- Suporta hints que aparecem em botão separado
- Animações de sucesso incluídas (flash, tremor, partículas)
- Integração completa com sistema de recompensas
- Salvamento automático de progresso via GameStateManager
