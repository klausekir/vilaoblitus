/**
 * ShapeMatchPuzzle.js
 * Puzzle de encaixe de formas - arraste objetos do inventário para moldes na cena
 */

class ShapeMatchPuzzle {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.molds = []; // Array de moldes na cena
        this.solved = false;
        this.draggedItem = null;

        // Formas disponíveis e suas propriedades visuais
        this.shapes = {
            'circle': { draw: this.drawCircle.bind(this), size: 40 },
            'square': { draw: this.drawSquare.bind(this), size: 40 },
            'triangle': { draw: this.drawTriangle.bind(this), size: 40 },
            'rectangle': { draw: this.drawRectangle.bind(this), size: 40 },
            'star': { draw: this.drawStar.bind(this), size: 40 }
        };
    }

    create() {
        // Criar moldes na cena baseado na configuração
        if (this.config.molds && Array.isArray(this.config.molds)) {
            this.config.molds.forEach((moldConfig, index) => {
                this.createMold(moldConfig, index);
            });
        }

        // Setup drag and drop do inventário
        this.setupInventoryDragDrop();
    }

    createMold(moldConfig, index) {
        const { x, y, shape, item } = moldConfig;

        // Container para o molde
        const moldContainer = this.scene.add.container(x, y);
        moldContainer.setDepth(100);

        // Fundo do molde (buraco/vazio)
        const moldBg = this.scene.add.graphics();
        moldBg.lineStyle(3, 0x888888, 1);
        moldBg.fillStyle(0x222222, 0.3);

        // Desenhar a forma do molde
        if (this.shapes[shape]) {
            this.shapes[shape].draw(moldBg, 0, 0, true); // true = é molde (vazio)
        }

        moldContainer.add(moldBg);

        // Adicionar label opcional
        if (moldConfig.label) {
            const label = this.scene.add.text(0, -60, moldConfig.label, {
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 8, y: 4 }
            });
            label.setOrigin(0.5);
            moldContainer.add(label);
        }

        // Área interativa para drop
        const hitArea = new Phaser.Geom.Circle(0, 0, 50);
        moldBg.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

        // Dados do molde
        const moldData = {
            container: moldContainer,
            config: moldConfig,
            shape: shape,
            item: item, // Item do inventário que encaixa aqui
            filled: false,
            graphics: moldBg
        };

        this.molds.push(moldData);

        // Setup drop zone
        this.scene.input.setDropZone(moldBg);

        moldBg.on('drop', (pointer, gameObject) => {
            this.onDropToMold(moldData, gameObject);
        });

        return moldData;
    }

    setupInventoryDragDrop() {
        // Este método será chamado quando o inventário estiver pronto
        // Por enquanto, vamos apenas preparar os listeners
        console.log('ShapeMatchPuzzle: Inventory drag-drop setup ready');
    }

    onDropToMold(mold, draggedObject) {
        console.log('Drop detected on mold:', mold.shape, draggedObject);

        // Verificar se o item arrastado corresponde ao item esperado pelo molde
        if (draggedObject.itemData && draggedObject.itemData.id === mold.item) {
            // Item correto! Encaixar
            this.fillMold(mold, draggedObject);
        } else {
            // Item errado, rejeitar
            this.rejectItem(draggedObject);
        }
    }

    fillMold(mold, draggedObject) {
        if (mold.filled) return;

        mold.filled = true;

        // Criar a forma preenchida no molde
        const filledGraphics = this.scene.add.graphics();
        filledGraphics.lineStyle(2, 0xd4af37, 1);
        filledGraphics.fillStyle(0x4a90e2, 1);

        if (this.shapes[mold.shape]) {
            this.shapes[mold.shape].draw(filledGraphics, 0, 0, false); // false = forma preenchida
        }

        mold.container.add(filledGraphics);
        mold.filledGraphics = filledGraphics;

        // Animação de encaixe
        filledGraphics.setScale(0);
        this.scene.tweens.add({
            targets: filledGraphics,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Efeito visual de sucesso
        this.scene.tweens.add({
            targets: mold.graphics,
            alpha: { from: 1, to: 0.3 },
            duration: 200,
            yoyo: true
        });

        // Remover item do inventário
        if (draggedObject.itemData) {
            this.scene.inventoryManager.removeItem(draggedObject.itemData.id);
        }

        // Som de encaixe (se disponível)
        // this.scene.sound.play('snap');

        // Verificar se todos os moldes foram preenchidos
        this.checkSolution();
    }

    rejectItem(draggedObject) {
        // Animação de rejeição (tremor)
        this.scene.tweens.add({
            targets: draggedObject,
            x: draggedObject.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 3
        });

        // Som de erro (se disponível)
        // this.scene.sound.play('error');
    }

    checkSolution() {
        const allFilled = this.molds.every(mold => mold.filled);

        if (allFilled && !this.solved) {
            this.onSolved();
        }
    }

    onSolved() {
        this.solved = true;

        // Animação de sucesso em todos os moldes
        this.molds.forEach(mold => {
            this.scene.tweens.add({
                targets: mold.filledGraphics,
                scale: { from: 1, to: 1.2 },
                alpha: { from: 1, to: 0.7 },
                duration: 300,
                yoyo: true,
                repeat: 2
            });
        });

        // Partículas de comemoração
        setTimeout(() => {
            this.createCelebrationParticles();
        }, 500);

        // Callback de sucesso
        if (this.config.onSolved) {
            setTimeout(() => {
                this.config.onSolved();
            }, 2000);
        }
    }

    createCelebrationParticles() {
        // Criar textura de partícula se não existir
        if (!this.scene.textures.exists('particle_star')) {
            const particleGraphics = this.scene.add.graphics();
            particleGraphics.fillStyle(0xffff00, 1);
            particleGraphics.fillStar(3, 3, 5, 3, 6, 0);
            particleGraphics.generateTexture('particle_star', 6, 6);
            particleGraphics.destroy();
        }

        // Criar partículas em cada molde
        this.molds.forEach(mold => {
            const particles = this.scene.add.particles(mold.container.x, mold.container.y, 'particle_star', {
                speed: { min: 50, max: 150 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 1000,
                quantity: 1,
                frequency: 100,
                blendMode: 'ADD'
            });
            particles.setDepth(999);

            setTimeout(() => {
                particles.stop();
            }, 1500);
        });
    }

    // Métodos para desenhar formas

    drawCircle(graphics, x, y, isMold) {
        if (isMold) {
            graphics.strokeCircle(x, y, 35);
            graphics.fillCircle(x, y, 35);
        } else {
            graphics.fillCircle(x, y, 35);
            graphics.strokeCircle(x, y, 35);
        }
    }

    drawSquare(graphics, x, y, isMold) {
        if (isMold) {
            graphics.strokeRect(x - 35, y - 35, 70, 70);
            graphics.fillRect(x - 35, y - 35, 70, 70);
        } else {
            graphics.fillRect(x - 35, y - 35, 70, 70);
            graphics.strokeRect(x - 35, y - 35, 70, 70);
        }
    }

    drawTriangle(graphics, x, y, isMold) {
        const points = [
            x, y - 35,       // topo
            x - 35, y + 35,  // esquerda baixo
            x + 35, y + 35   // direita baixo
        ];

        if (isMold) {
            graphics.strokeTriangle(x, y - 35, x - 35, y + 35, x + 35, y + 35);
            graphics.fillTriangle(x, y - 35, x - 35, y + 35, x + 35, y + 35);
        } else {
            graphics.fillTriangle(x, y - 35, x - 35, y + 35, x + 35, y + 35);
            graphics.strokeTriangle(x, y - 35, x - 35, y + 35, x + 35, y + 35);
        }
    }

    drawRectangle(graphics, x, y, isMold) {
        if (isMold) {
            graphics.strokeRect(x - 45, y - 25, 90, 50);
            graphics.fillRect(x - 45, y - 25, 90, 50);
        } else {
            graphics.fillRect(x - 45, y - 25, 90, 50);
            graphics.strokeRect(x - 45, y - 25, 90, 50);
        }
    }

    drawStar(graphics, x, y, isMold) {
        if (isMold) {
            graphics.strokeStar(x, y, 5, 15, 35, 0);
            graphics.fillStar(x, y, 5, 15, 35, 0);
        } else {
            graphics.fillStar(x, y, 5, 15, 35, 0);
            graphics.strokeStar(x, y, 5, 15, 35, 0);
        }
    }

    destroy() {
        // Destruir todos os moldes
        this.molds.forEach(mold => {
            if (mold.container) {
                mold.container.destroy();
            }
        });
        this.molds = [];
    }
}
