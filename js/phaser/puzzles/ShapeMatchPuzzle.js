/**
 * ShapeMatchPuzzle.js
 * Puzzle de encaixe de formas - arraste objetos do inventário para moldes na cena
 *
 * CONFIGURAÇÃO DE EXEMPLO:
 * {
 *   type: 'shape_match',
 *   id: 'statue_shapes',
 *   title: 'Encaixe as Formas',
 *   description: 'Arraste os objetos do inventário para os moldes corretos',
 *   molds: [
 *     { shape: 'circle', x: 300, y: 200, item: 'pedra_circular', label: 'Molde Circular' },
 *     { shape: 'square', x: 500, y: 200, item: 'pedra_quadrada' },
 *     { shape: 'triangle', x: 700, y: 200, item: 'pedra_triangular' },
 *     { shape: 'star', x: 400, y: 400, item: 'pedra_estrela' }
 *   ],
 *   hints: ['Observe as formas dos moldes', 'Cada objeto se encaixa em um molde específico'],
 *   onSolved: () => { console.log('Puzzle resolvido!'); }
 * }
 *
 * FORMAS DISPONÍVEIS: 'circle', 'square', 'triangle', 'rectangle', 'star'
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
        console.log('🔷 ShapeMatchPuzzle.create() chamado');
        console.log('Config:', this.config);
        console.log('Moldes:', this.config.molds);
        console.log('Puzzle já resolvido?', this.config.solved);

        // Criar moldes na cena baseado na configuração
        if (this.config.molds && Array.isArray(this.config.molds)) {
            console.log(`Criando ${this.config.molds.length} moldes...`);
            this.config.molds.forEach((moldConfig, index) => {
                this.createMold(moldConfig, index, this.config.solved);
            });

            // Se já resolvido, marcar como resolvido
            if (this.config.solved) {
                this.solved = true;
                console.log('✅ Puzzle carregado no estado resolvido');
            }
        } else {
            console.warn('⚠️ Nenhum molde definido no config!');
        }
    }

    createMold(moldConfig, index, alreadySolved = false) {
        let { x, y, shape, item } = moldConfig;

        console.log(`📍 Criando molde ${index + 1}:`, { x, y, shape, item, alreadySolved });

        // Se as coordenadas são em pixels (> 100), converter para porcentagem
        // (Compatibilidade com coordenadas antigas)
        const bounds = this.scene.getBackgroundBounds();
        if (x > 100) {
            console.log(`   Coordenada X em pixels (${x}), convertendo para %`);
            x = (x / bounds.bgWidth) * 100;
        }
        if (y > 100) {
            console.log(`   Coordenada Y em pixels (${y}), convertendo para %`);
            y = (y / bounds.bgHeight) * 100;
        }

        // Converter coordenadas de porcentagem para mundo
        const worldPos = this.scene.percentToWorld({ x, y });
        console.log(`   Posição final no mundo: (${worldPos.x}, ${worldPos.y})`);

        // Container para o molde
        const moldContainer = this.scene.add.container(worldPos.x, worldPos.y);
        moldContainer.setDepth(100);

        console.log(`✅ Molde ${index + 1} criado na posição (${worldPos.x}, ${worldPos.y})`);

        // Molde invisível (só área de drop)
        // Sem visual - o fundo da cena já tem a imagem do molde
        const moldBg = this.scene.add.graphics();
        moldBg.lineStyle(0); // Sem borda
        moldBg.fillStyle(0x00ff00, 0); // Invisível (alpha = 0)

        // Desenhar hitbox invisível (círculo simples para detecção)
        moldBg.fillCircle(0, 0, 50); // 50px de raio para área de drop

        moldContainer.add(moldBg);

        // Dados do molde
        const moldData = {
            container: moldContainer,
            config: moldConfig,
            shape: shape,
            item: item, // Item do inventário que encaixa aqui
            filled: alreadySolved, // Se já resolvido, marcar como preenchido
            graphics: moldBg
        };

        this.molds.push(moldData);

        // Se puzzle já está resolvido, mostrar um brilho sutil
        if (alreadySolved) {
            const filledGraphics = this.scene.add.graphics();
            filledGraphics.lineStyle(0);
            filledGraphics.fillStyle(0x00ff00, 0.2); // Brilho verde bem sutil

            // Círculo de brilho
            filledGraphics.fillCircle(0, 0, 55);

            moldContainer.add(filledGraphics);
            moldData.filledGraphics = filledGraphics;
            console.log(`   ✅ Molde ${index + 1} criado já preenchido (puzzle resolvido)`);
        }

        return moldData;
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

        // Criar brilho sutil (item encaixado com sucesso)
        const filledGraphics = this.scene.add.graphics();
        filledGraphics.lineStyle(0);
        filledGraphics.fillStyle(0x00ff00, 0.3); // Brilho verde sutil

        // Círculo de confirmação
        filledGraphics.fillCircle(0, 0, 55);

        mold.container.add(filledGraphics);
        mold.filledGraphics = filledGraphics;

        // Animação de encaixe (pulso)
        filledGraphics.setAlpha(0);
        this.scene.tweens.add({
            targets: filledGraphics,
            alpha: 0.3,
            duration: 300,
            ease: 'Cubic.easeOut'
        });

        // Remover item do inventário e marcar como consumido
        if (draggedObject.itemData && typeof gameStateManager !== 'undefined') {
            const itemId = draggedObject.itemData.id;
            console.log(`🗑️ Consumindo item ${itemId} no puzzle`);

            // Remover do inventário
            delete gameStateManager.state.inventory[itemId];

            // NÃO remover de collectedItems - manter para o jogo saber que já foi coletado
            // Mas adicionar à lista de itens consumidos
            if (!gameStateManager.state.consumedItems) {
                gameStateManager.state.consumedItems = [];
            }
            if (!gameStateManager.state.consumedItems.includes(itemId)) {
                gameStateManager.state.consumedItems.push(itemId);
                console.log(`   Item ${itemId} adicionado à lista de consumidos`);
            }

            // Remover sprite dropped da cena (se existir)
            if (this.scene.droppedItemSprites) {
                const droppedSprite = this.scene.droppedItemSprites.find(s => s.itemData?.id === itemId);
                if (droppedSprite && droppedSprite.sprite) {
                    console.log(`   Removendo sprite dropped do item ${itemId}`);
                    droppedSprite.sprite.destroy();
                    const spriteIndex = this.scene.droppedItemSprites.indexOf(droppedSprite);
                    if (spriteIndex > -1) {
                        this.scene.droppedItemSprites.splice(spriteIndex, 1);
                    }
                }
            }

            gameStateManager.saveProgress();
            gameStateManager.trigger('inventoryChanged');
            console.log(`✅ Item ${itemId} consumido e não reaparecerá`);
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

        // Animação de tremer em todos os moldes (sem explodir)
        this.molds.forEach((mold, index) => {
            // Tremer
            this.scene.tweens.add({
                targets: mold.container,
                x: mold.container.x + 3,
                duration: 50,
                yoyo: true,
                repeat: 5,
                delay: index * 100 // Tremem em sequência
            });

            // Pulso de brilho
            this.scene.tweens.add({
                targets: mold.filledGraphics,
                alpha: { from: 1, to: 0.6 },
                duration: 200,
                yoyo: true,
                repeat: 2,
                delay: index * 100
            });
        });

        // Callback de sucesso (itens ficam nos moldes, não somem)
        if (this.config.onSolved) {
            setTimeout(() => {
                this.config.onSolved();
            }, 1000);
        }
    }

    createCelebrationParticles() {
        // Criar textura de partícula se não existir
        if (!this.scene.textures.exists('particle_star')) {
            const particleGraphics = this.scene.add.graphics();
            particleGraphics.fillStyle(0xffff00, 1);
            particleGraphics.fillCircle(3, 3, 3);
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
