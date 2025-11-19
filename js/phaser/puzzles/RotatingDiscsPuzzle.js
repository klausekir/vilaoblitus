/**
 * RotatingDiscsPuzzle
 * Puzzle de discos rotatórios com símbolos (inspirado em Blackthorn Castle)
 */
class RotatingDiscsPuzzle {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.discs = [];
        this.solved = false;

        // Símbolos disponíveis (usando emojis por enquanto)
        this.symbolLibrary = {
            'lua': '🌙',
            'sol': '☀️',
            'estrela': '⭐',
            'arvore': '🌲',
            'fogo': '🔥',
            'agua': '💧',
            'terra': '🌍',
            'vento': '💨',
            'coracao': '❤️',
            'caveira': '💀',
            'chave': '🔑',
            'coroa': '👑'
        };
    }

    /**
     * Criar puzzle
     */
    create(x, y) {
        this.container = this.scene.add.container(x, y);
        this.container.setDepth(200);

        // Criar discos
        const numDiscs = this.config.discs || 3;
        const discRadius = [140, 100, 60]; // Raios dos discos (maior para menor)

        for (let i = 0; i < numDiscs; i++) {
            const disc = this.createDisc(i, discRadius[i]);
            this.discs.push(disc);
            this.container.add(disc.graphics);
        }

        // Adicionar botão de verificação
        this.createCheckButton();

        // Adicionar título
        this.addTitle();

        return this.container;
    }

    /**
     * Criar um disco
     */
    createDisc(index, radius) {
        const graphics = this.scene.add.graphics();
        const symbols = this.config.symbols || Object.keys(this.symbolLibrary).slice(0, 8);
        const numSymbols = symbols.length;
        const currentRotation = 0;

        const disc = {
            index,
            radius,
            graphics,
            symbols,
            numSymbols,
            currentRotation,
            symbolElements: []
        };

        // Desenhar círculo do disco
        this.drawDisc(disc);

        // Adicionar símbolos
        this.addSymbolsToDisc(disc);

        // Tornar clicável
        this.makeDiscInteractive(disc);

        return disc;
    }

    /**
     * Desenhar disco
     */
    drawDisc(disc) {
        const { graphics, radius } = disc;

        graphics.clear();

        // Círculo externo
        graphics.lineStyle(3, 0x8b4513);
        graphics.fillStyle(0x3a2817, 1);
        graphics.fillCircle(0, 0, radius);
        graphics.strokeCircle(0, 0, radius);

        // Círculo interno
        graphics.lineStyle(2, 0xa0522d);
        graphics.strokeCircle(0, 0, radius - 10);

        // Marcador no topo (posição de verificação)
        graphics.fillStyle(0xf0a500, 1);
        graphics.fillTriangle(
            -8, -radius - 15,
            8, -radius - 15,
            0, -radius - 5
        );
    }

    /**
     * Adicionar símbolos ao disco
     */
    addSymbolsToDisc(disc) {
        const angleStep = (Math.PI * 2) / disc.numSymbols;

        disc.symbols.forEach((symbolKey, i) => {
            const angle = (angleStep * i) - (Math.PI / 2); // -90° para começar no topo
            const x = Math.cos(angle + disc.currentRotation) * (disc.radius - 25);
            const y = Math.sin(angle + disc.currentRotation) * (disc.radius - 25);

            const symbolEmoji = this.symbolLibrary[symbolKey] || symbolKey;

            const text = this.scene.add.text(x, y, symbolEmoji, {
                fontSize: '28px',
                align: 'center'
            });
            text.setOrigin(0.5);

            disc.symbolElements.push({
                text,
                baseAngle: angle,
                symbolKey
            });

            disc.graphics.add(text);
        });
    }

    /**
     * Tornar disco interativo
     */
    makeDiscInteractive(disc) {
        // Criar zona de interação
        const hitArea = new Phaser.Geom.Circle(0, 0, disc.radius);

        disc.graphics.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        disc.graphics.on('pointerdown', () => this.rotateDisc(disc));

        // Efeito hover
        disc.graphics.on('pointerover', () => {
            disc.graphics.setAlpha(0.8);
        });

        disc.graphics.on('pointerout', () => {
            disc.graphics.setAlpha(1);
        });
    }

    /**
     * Girar disco
     */
    rotateDisc(disc) {
        if (this.solved) return;

        // Som de clique (se tiver)
        // this.scene.sound.play('click');

        const angleStep = (Math.PI * 2) / disc.numSymbols;
        disc.currentRotation += angleStep;

        // Animar rotação
        this.scene.tweens.add({
            targets: disc.symbolElements.map(s => s.text),
            duration: 200,
            onUpdate: () => {
                disc.symbolElements.forEach((symbolData, i) => {
                    const angle = symbolData.baseAngle + disc.currentRotation;
                    const x = Math.cos(angle) * (disc.radius - 25);
                    const y = Math.sin(angle) * (disc.radius - 25);
                    symbolData.text.setPosition(x, y);
                });
            }
        });

        // Verificar solução automaticamente
        setTimeout(() => this.checkSolution(), 250);
    }

    /**
     * Verificar solução
     */
    checkSolution() {
        if (this.solved) return;

        const solution = this.config.solution || [];

        // Verificar se o símbolo no topo de cada disco está correto
        const isCorrect = this.discs.every((disc, index) => {
            const topSymbol = this.getTopSymbol(disc);
            return topSymbol === solution[index];
        });

        if (isCorrect) {
            this.onSolved();
        }
    }

    /**
     * Obter símbolo no topo do disco
     */
    getTopSymbol(disc) {
        const angleStep = (Math.PI * 2) / disc.numSymbols;

        // Normalizar rotação
        const normalizedRotation = ((disc.currentRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

        // Encontrar qual símbolo está mais próximo do topo
        let closestIndex = 0;
        let minDiff = Math.PI * 2;

        for (let i = 0; i < disc.numSymbols; i++) {
            const symbolAngle = angleStep * i;
            const diff = Math.abs(normalizedRotation - symbolAngle);
            const wrappedDiff = Math.min(diff, (Math.PI * 2) - diff);

            if (wrappedDiff < minDiff) {
                minDiff = wrappedDiff;
                closestIndex = i;
            }
        }

        return disc.symbols[closestIndex];
    }

    /**
     * Puzzle resolvido
     */
    onSolved() {
        this.solved = true;

        // Feedback visual
        this.discs.forEach(disc => {
            disc.graphics.setAlpha(1);

            // Flash dourado
            this.scene.tweens.add({
                targets: disc.graphics,
                alpha: { from: 1, to: 0.5 },
                duration: 200,
                yoyo: true,
                repeat: 3
            });
        });

        // Som de sucesso
        // this.scene.sound.play('success');

        // Notificação
        uiManager.showNotification('✅ Puzzle resolvido!');

        // Callback
        if (this.config.onSolved) {
            setTimeout(() => this.config.onSolved(), 800);
        }
    }

    /**
     * Criar botão de verificação
     */
    createCheckButton() {
        const button = this.scene.add.text(0, 180, 'Verificar', {
            fontSize: '18px',
            color: '#000',
            backgroundColor: '#f0a500',
            padding: { x: 15, y: 8 }
        });

        button.setOrigin(0.5);
        button.setInteractive({ useHandCursor: true });
        button.setDepth(201);

        button.on('pointerdown', () => {
            this.checkSolution();
            if (!this.solved) {
                uiManager.showNotification('Ainda não está correto...');
            }
        });

        button.on('pointerover', () => {
            button.setScale(1.1);
        });

        button.on('pointerout', () => {
            button.setScale(1);
        });

        this.container.add(button);
    }

    /**
     * Adicionar título
     */
    addTitle() {
        const title = this.scene.add.text(0, -200, this.config.title || 'Alinhe os Símbolos', {
            fontSize: '20px',
            color: '#f0a500',
            fontStyle: 'bold'
        });

        title.setOrigin(0.5);
        title.setDepth(201);

        this.container.add(title);
    }

    /**
     * Resetar puzzle
     */
    reset() {
        this.solved = false;
        this.discs.forEach(disc => {
            disc.currentRotation = 0;
            disc.symbolElements.forEach((symbolData, i) => {
                const angle = symbolData.baseAngle;
                const x = Math.cos(angle) * (disc.radius - 25);
                const y = Math.sin(angle) * (disc.radius - 25);
                symbolData.text.setPosition(x, y);
            });
        });
    }

    /**
     * Destruir puzzle
     */
    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}
