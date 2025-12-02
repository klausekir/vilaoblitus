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
        // NÃO usar scrollFactor(0) pois queremos que ele seja afetado pela câmera
        // Mas posicionado no centro da view, então aparece sempre no centro da tela

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

        // Adicionar referências ao pieceData original
        pieceData.hexagon = hexagon;
        pieceData.symbolText = symbolText;
        pieceData.indicator = indicator;
        pieceData.currentRotation = initialRotation;

        // Tornar interativo
        const hitArea = new Phaser.Geom.Circle(position.x, position.y, size);
        hexagon.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        hexagon.on('pointerdown', () => {
            if (!this.solved) {
                this.rotatePiece(pieceData);
            }
        });

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

        // Som de clique (se disponível)
        // this.scene.sound.play('click');
    }

    checkSolution() {
        this.puzzlePieces.forEach((piece, i) => {
        });

        const allCorrect = this.puzzlePieces.every(piece => {
            return piece.currentRotation === piece.correctRotation;
        });


        if (allCorrect && !this.solved) {
            this.onSolved();
        }
    }

    onSolved() {
        this.solved = true;

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
        // Partículas de poeira dourada (simplificado sem texture)
        const particleGraphics = this.scene.add.graphics();
        particleGraphics.fillStyle(0xd4af37, 1);
        particleGraphics.fillCircle(0, 0, 3);
        particleGraphics.generateTexture('particle_dust', 6, 6);
        particleGraphics.destroy();

        const particles = this.scene.add.particles(0, 0, 'particle_dust', {
            speed: { min: -100, max: 100 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 2,
            blendMode: 'ADD'
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
