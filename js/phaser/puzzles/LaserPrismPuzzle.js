class LaserPrismPuzzle {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.solved = false;

        // Estado do puzzle
        this.laserSource = null;     // Fonte laser
        this.receptor = null;        // Receptor alvo
        this.slots = [];             // 4 caixinhas
        this.prisms = [];            // Prismas colocados
        this.laserPath = null;       // Graphics do raio laser
    }

    create(x, y) {
        // 1. Criar container centralizado
        this.container = this.scene.add.container(x, y);
        this.container.setDepth(1000);

        // 2. Criar fundo escuro
        this.createBackground();

        // 3. Criar laser source
        this.createLaserSource();

        // 4. Criar receptor
        this.createReceptor();

        // 5. Criar 4 slots para prismas
        this.createSlots();

        // 6. Criar raio laser
        this.laserPath = this.scene.add.graphics();
        this.container.add(this.laserPath);

        // 7. Desenhar laser inicial
        this.updateLaser();

        // 8. Adicionar botão fechar
        this.createCloseButton();

        return this.container;
    }

    createBackground() {
        const width = 900;
        const height = 600;

        // Fundo escuro semi-transparente
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.85);
        bg.fillRect(-width / 2, -height / 2, width, height);

        // Borda
        bg.lineStyle(3, 0x4a90e2, 1);
        bg.strokeRect(-width / 2, -height / 2, width, height);

        this.container.add(bg);

        // Título
        const title = this.scene.add.text(0, -height / 2 + 30, this.config.title || 'Sistema de Laser', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        this.container.add(title);

        // Descrição
        if (this.config.description) {
            const description = this.scene.add.text(0, -height / 2 + 65, this.config.description, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#cccccc'
            });
            description.setOrigin(0.5);
            this.container.add(description);
        }
    }

    createLaserSource() {
        // Desenhar emissor de laser (retângulo vermelho)
        const source = this.scene.add.graphics();
        source.fillStyle(0xff0000, 1);
        source.fillRect(-15, -10, 30, 20);
        source.lineStyle(2, 0xff6666);
        source.strokeRect(-15, -10, 30, 20);

        // Adicionar label "LASER"
        const label = this.scene.add.text(0, 0, 'LASER', {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        label.setOrigin(0.5);

        // Ponto de saída do laser
        const laserPos = this.config.laserPosition || { x: -200, y: 0 };
        this.laserSource = {
            x: laserPos.x,
            y: laserPos.y,
            direction: this.config.laserDirection || 0,  // 0=direita, 90=baixo, 180=esq, 270=cima
            graphics: source,
            label: label
        };

        source.x = this.laserSource.x;
        source.y = this.laserSource.y;
        label.x = this.laserSource.x;
        label.y = this.laserSource.y;

        this.container.add(source);
        this.container.add(label);
    }

    createReceptor() {
        // Desenhar receptor (círculo verde)
        const receptor = this.scene.add.graphics();
        receptor.fillStyle(0x00ff00, 0.3);
        receptor.fillCircle(0, 0, 20);
        receptor.lineStyle(3, 0x00ff00);
        receptor.strokeCircle(0, 0, 20);

        // Adicionar label "SENSOR"
        const label = this.scene.add.text(0, 30, 'SENSOR', {
            fontSize: '10px',
            fontFamily: 'Arial',
            color: '#00ff00',
            fontStyle: 'bold'
        });
        label.setOrigin(0.5);

        const receptorPos = this.config.receptorPosition || { x: 200, y: 0 };
        this.receptor = {
            x: receptorPos.x,
            y: receptorPos.y,
            graphics: receptor,
            label: label
        };

        receptor.x = this.receptor.x;
        receptor.y = this.receptor.y;
        label.x = this.receptor.x;
        label.y = this.receptor.y;

        this.container.add(receptor);
        this.container.add(label);
    }

    createSlots() {
        // 4 caixinhas para encaixar prismas
        const slots = this.config.slots || [
            { x: -100, y: -50, correctRotation: 0 },
            { x: 0, y: -50, correctRotation: 90 },
            { x: 0, y: 50, correctRotation: 180 },
            { x: 100, y: 50, correctRotation: 270 }
        ];

        slots.forEach((slotConfig, index) => {
            const slot = this.createSlot(slotConfig, index);
            this.slots.push(slot);
        });
    }

    createSlot(config, index) {
        // Desenhar caixinha (quadrado pontilhado)
        const slotGraphics = this.scene.add.graphics();
        slotGraphics.lineStyle(2, 0xffaa00, 0.5);
        slotGraphics.strokeRect(-25, -25, 50, 50);

        // Adicionar número do slot
        const slotNumber = this.scene.add.text(0, -35, `#${index + 1}`, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ffaa00',
            fontStyle: 'bold'
        });
        slotNumber.setOrigin(0.5);

        slotGraphics.x = config.x;
        slotGraphics.y = config.y;
        slotNumber.x = config.x;
        slotNumber.y = config.y - 35;

        this.container.add(slotGraphics);
        this.container.add(slotNumber);

        const slotData = {
            index: index,
            x: config.x,
            y: config.y,
            graphics: slotGraphics,
            numberText: slotNumber,
            prism: null,  // Prisma colocado (null = vazio)
            correctRotation: config.correctRotation
        };

        // Tornar clicável
        const hitArea = new Phaser.Geom.Circle(0, 0, 30);
        slotGraphics.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        slotGraphics.on('pointerdown', () => this.onSlotClick(slotData));

        return slotData;
    }

    onSlotClick(slot) {
        if (slot.prism) {
            // Rotacionar prisma existente
            this.rotatePrism(slot);
        } else {
            // Tentar colocar prisma do inventário
            this.placePrismInSlot(slot);
        }
    }

    placePrismInSlot(slot) {
        // Verificar se jogador tem prisma no inventário
        const prismItem = this.findPrismInInventory();

        if (!prismItem) {
            if (typeof uiManager !== 'undefined') {
                uiManager.showNotification('Você precisa encontrar um prisma primeiro!');
            }
            return;
        }

        // Criar sprite do prisma (triângulo desenhado)
        const prismGraphics = this.scene.add.graphics();
        this.drawPrismTriangle(prismGraphics, 0);

        prismGraphics.x = slot.x;
        prismGraphics.y = slot.y;
        this.container.add(prismGraphics);

        // Dados do prisma
        const prismData = {
            graphics: prismGraphics,
            rotation: 0,  // 0, 90, 180, 270
            slot: slot
        };

        slot.prism = prismData;

        // Remover do inventário
        if (typeof gameStateManager !== 'undefined') {
            delete gameStateManager.state.inventory[prismItem.id];
            gameStateManager.saveProgress();
        }

        // Atualizar laser
        this.updateLaser();
        this.checkSolution();
    }

    drawPrismTriangle(graphics, rotation) {
        graphics.clear();

        // Desenhar triângulo (prisma de vidro)
        graphics.fillStyle(0x88ccff, 0.6);
        graphics.lineStyle(2, 0x4488cc, 1);

        // Triângulo apontando para cima (rotação 0)
        graphics.beginPath();
        graphics.moveTo(0, -20);   // topo
        graphics.lineTo(-17, 17);  // base esquerda
        graphics.lineTo(17, 17);   // base direita
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();

        // Aplicar rotação
        graphics.angle = rotation;
    }

    rotatePrism(slot) {
        if (!slot.prism) return;

        // Rotacionar 90 graus
        slot.prism.rotation = (slot.prism.rotation + 90) % 360;

        // Animação
        this.scene.tweens.add({
            targets: slot.prism.graphics,
            angle: slot.prism.rotation,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.updateLaser();
                this.checkSolution();
            }
        });
    }

    findPrismInInventory() {
        if (typeof gameStateManager === 'undefined') return null;

        // Procurar item com id='prism' no inventário
        const inventory = gameStateManager.getInventoryArray();
        return inventory.find(item => item.id && item.id.startsWith('prism'));
    }

    updateLaser() {
        // Limpar laser anterior
        this.laserPath.clear();
        this.laserPath.lineStyle(3, 0xffff00, 1);

        // Traçar caminho do laser
        let currentX = this.laserSource.x;
        let currentY = this.laserSource.y;
        let direction = this.laserSource.direction; // 0=E, 90=S, 180=W, 270=N

        this.laserPath.beginPath();
        this.laserPath.moveTo(currentX, currentY);

        const maxSteps = 20;  // Evitar loop infinito
        let reachedReceptor = false;

        for (let step = 0; step < maxSteps; step++) {
            // Calcular próximo ponto (100px na direção atual)
            const nextPoint = this.getNextPoint(currentX, currentY, direction, 100);

            // Verificar se bateu em prisma
            const hitPrism = this.checkPrismCollision(currentX, currentY, nextPoint.x, nextPoint.y);

            if (hitPrism) {
                // Calcular caminho ATRAVÉS do prisma (entrada → reflexão → saída)
                const prismPath = this.calculatePrismPath(currentX, currentY, direction, hitPrism);

                if (prismPath) {
                    // Desenhar laser externo até entrada do prisma
                    this.laserPath.lineTo(prismPath.entry.x, prismPath.entry.y);
                    this.laserPath.strokePath();

                    // Desenhar caminho interno (azul claro)
                    this.laserPath.lineStyle(3, 0x88ddff, 1);
                    this.laserPath.beginPath();
                    this.laserPath.moveTo(prismPath.entry.x, prismPath.entry.y);
                    this.laserPath.lineTo(prismPath.reflection.x, prismPath.reflection.y);
                    this.laserPath.lineTo(prismPath.exit.x, prismPath.exit.y);
                    this.laserPath.strokePath();

                    // Retomar laser externo (amarelo) saindo do prisma
                    this.laserPath.lineStyle(3, 0xffff00, 1);
                    this.laserPath.beginPath();
                    this.laserPath.moveTo(prismPath.exit.x, prismPath.exit.y);

                    currentX = prismPath.exit.x;
                    currentY = prismPath.exit.y;
                    direction = prismPath.exitDirection;
                    // Force direction to nearest 90° to prevent "bent" lasers
                    direction = Math.round(direction / 90) * 90 % 360;
                } else {
                    // Falha ao calcular caminho, pular prisma
                    currentX = nextPoint.x;
                    currentY = nextPoint.y;
                }
            } else {
                // Desenhar até o próximo ponto
                this.laserPath.lineTo(nextPoint.x, nextPoint.y);

                // Verificar se atingiu receptor
                if (this.isPointNearReceptor(nextPoint.x, nextPoint.y)) {
                    reachedReceptor = true;
                    break;
                }

                // Verificar se saiu da tela
                if (this.isOutOfBounds(nextPoint.x, nextPoint.y)) {
                    break;
                }

                currentX = nextPoint.x;
                currentY = nextPoint.y;
            }
        }

        this.laserPath.strokePath();

        // Atualizar cor do receptor
        this.receptor.graphics.clear();
        if (reachedReceptor) {
            this.receptor.graphics.fillStyle(0x00ff00, 1);  // Verde brilhante
            this.receptor.graphics.fillCircle(0, 0, 20);
            this.receptor.graphics.lineStyle(3, 0x00ff00);
            this.receptor.graphics.strokeCircle(0, 0, 20);
        } else {
            this.receptor.graphics.fillStyle(0x00ff00, 0.3);  // Verde opaco
            this.receptor.graphics.fillCircle(0, 0, 20);
            this.receptor.graphics.lineStyle(3, 0x00ff00);
            this.receptor.graphics.strokeCircle(0, 0, 20);
        }
    }

    getNextPoint(x, y, direction, distance) {
        const rad = Phaser.Math.DegToRad(direction);
        return {
            x: x + Math.cos(rad) * distance,
            y: y + Math.sin(rad) * distance
        };
    }

    calculateReflection(incomingDirection, prismRotation) {
        // Física correta do prisma: laser entra pela face isométrica → bate na hipotenusa →
        // refrata 90° → sai pela outra face isométrica

        // Normalize directions to 0-360
        const incoming = ((incomingDirection % 360) + 360) % 360;
        const rotation = ((prismRotation % 360) + 360) % 360;

        // Right triangle prism reflection table (90° angle at bottom-left)
        // Laser enters through STRAIGHT edge, hits hypotenuse, refracts 90°, exits other STRAIGHT edge
        const reflectionMap = {
            0: {    // ↗ Right angle at bottom-left (vertical + horizontal edges)
                0: 90,     // → enters left edge, exits down (clockwise 90°)
                90: 0,     // ↓ enters bottom edge, exits right (counter-clockwise 90°)
                180: null, // ← can't enter (hypotenuse side)
                270: null  // ↑ can't enter (no edge)
            },
            90: {   // ↘ Right angle at top-left (vertical + horizontal edges)
                0: 270,    // → enters left edge, exits up (counter-clockwise 90°)
                90: null,  // ↓ can't enter (no edge)
                180: null, // ← can't enter (hypotenuse side)
                270: 0     // ↑ enters top edge, exits right (clockwise 90°)
            },
            180: {  // ↙ Right angle at top-right (vertical + horizontal edges)
                0: null,   // → can't enter (no edge)
                90: 180,   // ↓ enters top edge, exits left (clockwise 90°)
                180: 270,  // ← enters right edge, exits up (counter-clockwise 90°)
                270: null  // ↑ can't enter (hypotenuse side)
            },
            270: {  // ↖ Right angle at bottom-right (vertical + horizontal edges)
                0: null,   // → can't enter (hypotenuse side)
                90: 180,   // ↓ enters bottom edge, exits left (counter-clockwise 90°)
                180: 90,   // ← enters right edge, exits down (clockwise 90°)
                270: null  // ↑ can't enter (no edge)
            }
        };

        // Find closest rotation angle (0, 90, 180, 270)
        const rotationKey = Math.round(rotation / 90) * 90 % 360;

        // Find closest incoming direction
        const incomingKey = Math.round(incoming / 90) * 90 % 360;

        // Get reflection (null means laser can't enter from this direction - passes through)
        const refracted = reflectionMap[rotationKey]?.[incomingKey];

        // If null (invalid entry), laser passes through without refracting
        if (refracted === null || refracted === undefined) {
            return incoming; // Continue same direction
        }

        return refracted;
    }

    checkPrismCollision(x1, y1, x2, y2) {
        // Verificar se linha do laser cruza com algum prisma usando intersecção real de linha-triângulo
        for (let slot of this.slots) {
            if (!slot.prism) continue;

            // Get triangle vertices (base shape at rotation 0)
            const baseVertices = [
                { x: -18, y: 12 },   // Bottom-left (90° angle)
                { x: -18, y: -12 },  // Top-left
                { x: 18, y: 12 }     // Bottom-right
            ];

            // Rotate vertices based on prism rotation
            const rad = Phaser.Math.DegToRad(slot.prism.rotation);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const vertices = baseVertices.map(v => ({
                x: slot.x + (v.x * cos - v.y * sin),
                y: slot.y + (v.x * sin + v.y * cos)
            }));

            // Define edges (only straight edges can be entry points)
            const edges = [
                { start: vertices[0], end: vertices[1], type: 'straight' },  // Left edge
                { start: vertices[1], end: vertices[2], type: 'hypotenuse' }, // Hypotenuse
                { start: vertices[2], end: vertices[0], type: 'straight' }   // Bottom edge
            ];

            // Test laser ray against straight edges only
            for (let edge of edges) {
                if (edge.type === 'straight') {
                    const intersection = this.lineIntersection(
                        x1, y1, x2, y2,
                        edge.start.x, edge.start.y, edge.end.x, edge.end.y
                    );
                    if (intersection) {
                        return {
                            x: intersection.x,
                            y: intersection.y,
                            rotation: slot.prism.rotation,
                            slotX: slot.x,
                            slotY: slot.y
                        };
                    }
                }
            }
        }
        return null;
    }

    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    calculatePrismPath(startX, startY, laserDir, hitPrism) {
        const rad = Phaser.Math.DegToRad(laserDir);
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);

        // Triangle vertices at rotation 0
        const baseVertices = [
            { x: -18, y: 12 },   // Bottom-left (90° angle)
            { x: -18, y: -12 },  // Top-left
            { x: 18, y: 12 }     // Bottom-right
        ];

        // Rotate vertices based on prism rotation
        const prismRad = Phaser.Math.DegToRad(hitPrism.rotation);
        const cos = Math.cos(prismRad);
        const sin = Math.sin(prismRad);

        // Get slot position from hitPrism
        const slotX = hitPrism.slotX || hitPrism.x;
        const slotY = hitPrism.slotY || hitPrism.y;

        const vertices = baseVertices.map(v => ({
            x: slotX + (v.x * cos - v.y * sin),
            y: slotY + (v.x * sin + v.y * cos)
        }));

        // Define edges
        const edges = [
            { start: vertices[0], end: vertices[1], type: 'straight' },  // Left edge
            { start: vertices[1], end: vertices[2], type: 'hypotenuse' }, // Hypotenuse
            { start: vertices[2], end: vertices[0], type: 'straight' }   // Bottom edge
        ];

        // Find entry point (intersection with straight edges only)
        let entryPoint = null;
        let entryEdge = null;

        for (let edge of edges) {
            if (edge.type === 'straight') {
                const intersection = this.lineIntersection(
                    startX, startY, startX + dx * 100, startY + dy * 100,
                    edge.start.x, edge.start.y, edge.end.x, edge.end.y
                );
                if (intersection && !entryPoint) {
                    entryPoint = intersection;
                    entryEdge = edge;
                    break;
                }
            }
        }

        if (!entryPoint) return null;

        // Find hypotenuse
        const hypotenuse = edges.find(e => e.type === 'hypotenuse');
        if (!hypotenuse) return null;

        // Calculate where internal ray hits hypotenuse
        const reflectionPoint = this.lineIntersection(
            entryPoint.x, entryPoint.y, entryPoint.x + dx * 50, entryPoint.y + dy * 50,
            hypotenuse.start.x, hypotenuse.start.y, hypotenuse.end.x, hypotenuse.end.y
        );

        if (!reflectionPoint) return null;

        // Calculate refracted direction
        const exitDirection = this.calculateReflection(laserDir, hitPrism.rotation);
        const exitRad = Phaser.Math.DegToRad(exitDirection);
        const exitDx = Math.cos(exitRad);
        const exitDy = Math.sin(exitRad);

        // Find exit point (intersection with other straight edge)
        let exitPoint = null;
        for (let edge of edges) {
            if (edge.type === 'straight' && edge !== entryEdge) {
                const intersection = this.lineIntersection(
                    reflectionPoint.x, reflectionPoint.y,
                    reflectionPoint.x + exitDx * 50, reflectionPoint.y + exitDy * 50,
                    edge.start.x, edge.start.y, edge.end.x, edge.end.y
                );
                if (intersection) {
                    exitPoint = intersection;
                    break;
                }
            }
        }

        if (!exitPoint) return null;

        return {
            entry: entryPoint,
            reflection: reflectionPoint,
            exit: exitPoint,
            exitDirection: exitDirection
        };
    }

    isPointNearReceptor(x, y) {
        const distance = Phaser.Math.Distance.Between(
            x, y,
            this.receptor.x,
            this.receptor.y
        );
        return distance < 25;
    }

    isOutOfBounds(x, y) {
        return Math.abs(x) > 400 || Math.abs(y) > 250;
    }

    checkSolution() {
        // Verificar se todos os prismas estão na rotação correta
        const allCorrect = this.slots.every(slot => {
            if (!slot.prism) return false;
            return slot.prism.rotation === slot.correctRotation;
        });

        if (allCorrect && !this.solved) {
            this.onSolved();
        }
    }

    onSolved() {
        this.solved = true;

        // 1. Flash no receptor
        this.scene.tweens.add({
            targets: this.receptor.graphics,
            alpha: { from: 1, to: 0.5 },
            duration: 200,
            yoyo: true,
            repeat: 5
        });

        // 2. Laser pisca
        this.scene.tweens.add({
            targets: this.laserPath,
            alpha: { from: 1, to: 0.3 },
            duration: 150,
            yoyo: true,
            repeat: 6
        });

        // 3. Mostrar mensagem de sucesso
        if (typeof uiManager !== 'undefined') {
            uiManager.showNotification('✓ Puzzle resolvido!');
        }

        // 4. Callback
        if (this.config.onSolved) {
            setTimeout(() => {
                this.config.onSolved();
                this.close();
            }, 2000);
        }
    }

    createCloseButton() {
        const closeBtn = this.scene.add.text(400, -280, '✕', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        closeBtn.setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.close());
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff0000'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ffffff'));

        this.container.add(closeBtn);
    }

    close() {
        if (this.scene?.puzzleManager) {
            this.scene.puzzleManager.closePuzzle();
        }
    }

    destroy() {
        if (this.container) {
            this.container.destroy();
        }
    }
}
