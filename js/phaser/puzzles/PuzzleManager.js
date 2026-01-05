/**
 * PuzzleManager
 * Sistema unificado para todos os tipos de puzzles
 * Inspirado em Blackthorn Castle
 */
class PuzzleManager {
    constructor(scene) {
        this.scene = scene;
        this.activePuzzle = null;
        this.hintTimer = null;
    }

    /**
     * Criar puzzle baseado no tipo
     */
    createPuzzle(config) {
        // Fechar puzzle anterior se existir
        if (this.activePuzzle) {
            this.closePuzzle();
        }

        switch (config.type) {
            case 'egyptian':
                return this.createEgyptianPuzzle(config);
            case 'rotating_discs':
                return this.createRotatingDiscsPuzzle(config);
            case 'code':
                return this.createCodePuzzle(config);
            case 'pattern':
                return this.createPatternPuzzle(config);
            case 'sequence_buttons':
                return this.createSequenceButtonsPuzzle(config);
            case 'item_placement':
                return this.createItemPlacementPuzzle(config);
            case 'shape_match':
                return this.createShapeMatchPuzzle(config);
            default:
                console.error('Tipo de puzzle desconhecido:', config.type);
                return null;
        }
    }

    /**
     * PUZZLE 0: Parede Egípcia
     */
    createEgyptianPuzzle(config) {
        const puzzle = new EgyptianPuzzle(this.scene, config);

        // Salvar zoom atual e resetar para 1 durante o puzzle
        const camera = this.scene.cameras.main;
        this.savedCameraZoom = camera.zoom;
        this.savedCameraScroll = { x: camera.scrollX, y: camera.scrollY };

        if (camera.zoom !== 1) {
            camera.setZoom(1);
            camera.centerOn(camera.midPoint.x, camera.midPoint.y);
        }

        const centerX = this.scene.scale.width / 2;
        const centerY = this.scene.scale.height / 2;

        puzzle.create(centerX, centerY);
        this.activePuzzle = puzzle;
        this.startHintTimer(config);

        return puzzle;
    }

    /**
     * PUZZLE 1: Discos Rotatórios
     */
    createRotatingDiscsPuzzle(config) {
        const puzzle = new RotatingDiscsPuzzle(this.scene, config);
        const centerX = this.scene.scale.width / 2;
        const centerY = this.scene.scale.height / 2;

        puzzle.create(centerX, centerY);
        this.activePuzzle = puzzle;
        this.startHintTimer(config);

        return puzzle;
    }

    /**
     * PUZZLE 2: Código Numérico
     */
    createCodePuzzle(config) {
        const modal = this.createModal(config.title || 'Código Numérico');

        const digits = config.digits || 4;
        let currentCode = '';

        // Display do código
        const display = document.createElement('div');
        display.style.cssText = `
            font-size: 48px;
            font-family: monospace;
            color: #f0a500;
            text-align: center;
            margin: 20px 0;
            letter-spacing: 10px;
        `;
        display.textContent = '−'.repeat(digits);

        // Teclado numérico
        const keypad = document.createElement('div');
        keypad.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            max-width: 300px;
            margin: 20px auto;
        `;

        // Botões 1-9
        for (let i = 1; i <= 9; i++) {
            const btn = this.createButton(i.toString());
            btn.onclick = () => {
                if (currentCode.length < digits) {
                    currentCode += i;
                    this.updateCodeDisplay(display, currentCode, digits);
                }
            };
            keypad.appendChild(btn);
        }

        // Linha inferior: Limpar, 0, OK
        const btnClear = this.createButton('Limpar');
        btnClear.onclick = () => {
            currentCode = '';
            this.updateCodeDisplay(display, currentCode, digits);
        };

        const btn0 = this.createButton('0');
        btn0.onclick = () => {
            if (currentCode.length < digits) {
                currentCode += '0';
                this.updateCodeDisplay(display, currentCode, digits);
            }
        };

        const btnOk = this.createButton('OK', '#4CAF50');
        btnOk.onclick = () => {
            if (currentCode.length === digits) {
                if (currentCode === config.solution) {
                    this.onPuzzleSolved(config, modal);
                } else {
                    uiManager.showNotification('❌ Código incorreto!');
                    currentCode = '';
                    this.updateCodeDisplay(display, currentCode, digits);
                }
            }
        };

        keypad.appendChild(btnClear);
        keypad.appendChild(btn0);
        keypad.appendChild(btnOk);

        modal.content.appendChild(display);
        modal.content.appendChild(keypad);

        this.showHints(modal.content, config);

        document.body.appendChild(modal.element);
        this.activePuzzle = { modal: modal.element };
    }

    /**
     * PUZZLE 3: Padrão de Símbolos
     */
    createPatternPuzzle(config) {
        const modal = this.createModal(config.title || 'Sequência de Símbolos');

        const symbols = config.symbols || [];
        const solution = config.solution || [];
        let selectedSequence = [];

        // Símbolos disponíveis
        const symbolGrid = document.createElement('div');
        symbolGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${Math.min(symbols.length, 4)}, 1fr);
            gap: 15px;
            margin: 20px 0;
        `;

        const symbolEmojis = {
            'corvo': '🦅',
            'lobo': '🐺',
            'serpente': '🐍',
            'dragao': '🐉',
            'aguia': '🦅',
            'leao': '🦁'
        };

        symbols.forEach(symbol => {
            const btn = document.createElement('button');
            btn.textContent = symbolEmojis[symbol] || symbol;
            btn.style.cssText = `
                font-size: 48px;
                padding: 20px;
                background: #2a2a2a;
                border: 2px solid #444;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s;
            `;

            btn.onclick = () => {
                if (selectedSequence.length < solution.length) {
                    selectedSequence.push(symbol);
                    btn.style.borderColor = '#f0a500';
                    btn.style.opacity = '0.5';
                    updateSequenceDisplay();

                    if (selectedSequence.length === solution.length) {
                        checkSolution();
                    }
                }
            };

            btn.onmouseenter = () => {
                if (!selectedSequence.includes(symbol)) {
                    btn.style.transform = 'scale(1.1)';
                }
            };

            btn.onmouseleave = () => {
                btn.style.transform = 'scale(1)';
            };

            symbolGrid.appendChild(btn);
        });

        // Display da sequência selecionada
        const sequenceDisplay = document.createElement('div');
        sequenceDisplay.style.cssText = `
            font-size: 36px;
            text-align: center;
            margin: 20px 0;
            min-height: 60px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        `;

        const updateSequenceDisplay = () => {
            sequenceDisplay.innerHTML = selectedSequence
                .map(s => `<span>${symbolEmojis[s] || s}</span>`)
                .join(' → ');
        };

        const checkSolution = () => {
            const correct = selectedSequence.every((s, i) => s === solution[i]);

            if (correct) {
                this.onPuzzleSolved(config, { element: modal.element });
            } else {
                uiManager.showNotification('❌ Sequência incorreta!');
                selectedSequence = [];
                updateSequenceDisplay();

                // Resetar botões
                symbolGrid.querySelectorAll('button').forEach(btn => {
                    btn.style.borderColor = '#444';
                    btn.style.opacity = '1';
                });
            }
        };

        // Botão resetar
        const btnReset = this.createButton('Resetar');
        btnReset.onclick = () => {
            selectedSequence = [];
            updateSequenceDisplay();
            symbolGrid.querySelectorAll('button').forEach(btn => {
                btn.style.borderColor = '#444';
                btn.style.opacity = '1';
            });
        };

        modal.content.appendChild(sequenceDisplay);
        modal.content.appendChild(symbolGrid);
        modal.content.appendChild(btnReset);

        this.showHints(modal.content, config);

        document.body.appendChild(modal.element);
        this.activePuzzle = { modal: modal.element };
    }

    /**
     * PUZZLE 4: Botões de Sequência (Fechadura)
     */
    createSequenceButtonsPuzzle(config) {
        const modal = this.createModal(config.title || 'Fechadura');

        const elements = config.elements || [];
        const targetPos = config.targetPos || 50;
        const tolerance = config.tolerance || 5;

        // Display das barras
        const barsContainer = document.createElement('div');
        barsContainer.style.cssText = `
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 200px;
            margin: 20px 0;
            background: #1a1a1a;
            border: 2px solid #444;
            border-radius: 10px;
            padding: 20px;
            position: relative;
        `;

        // Linha de alvo
        const targetLine = document.createElement('div');
        targetLine.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            top: ${targetPos}%;
            height: 2px;
            background: #4CAF50;
            z-index: 1;
        `;
        barsContainer.appendChild(targetLine);

        // Criar barras
        const bars = elements.map(elem => {
            const barContainer = document.createElement('div');
            barContainer.style.cssText = `
                flex: 1;
                height: 100%;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                position: relative;
            `;

            const bar = document.createElement('div');
            bar.style.cssText = `
                width: 20px;
                height: 80px;
                background: #f0a500;
                border-radius: 5px;
                position: absolute;
                top: ${elem.initialPos}%;
                transition: top 0.3s;
            `;

            barContainer.appendChild(bar);
            barsContainer.appendChild(barContainer);

            return { element: bar, currentPos: elem.initialPos, id: elem.id };
        });

        // Botões de controle
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 20px 0;
        `;

        (config.buttons || []).forEach((btnConfig, index) => {
            const btn = this.createButton(`Botão ${index + 1}`);
            btn.onclick = () => {
                // Aplicar movimentos
                btnConfig.moves.forEach(move => {
                    const match = move.match(/([+-]\d+)\s+(\w+)/);
                    if (match) {
                        const delta = parseInt(match[1]);
                        const barId = match[2];

                        const bar = bars.find(b => b.id === barId);
                        if (bar) {
                            bar.currentPos = Math.max(0, Math.min(100, bar.currentPos + delta));
                            bar.element.style.top = `${bar.currentPos}%`;
                        }
                    }
                });

                // Verificar solução
                setTimeout(() => {
                    const solved = bars.every(bar =>
                        Math.abs(bar.currentPos - targetPos) <= tolerance
                    );

                    if (solved) {
                        this.onPuzzleSolved(config, { element: modal.element });
                    }
                }, 350);
            };

            buttonsContainer.appendChild(btn);
        });

        modal.content.appendChild(barsContainer);
        modal.content.appendChild(buttonsContainer);

        this.showHints(modal.content, config);

        document.body.appendChild(modal.element);
        this.activePuzzle = { modal: modal.element };
    }

    /**
     * PUZZLE 7: Conecta Blocos (Shape Match)
     */
    createShapeMatchPuzzle(config) {
        const puzzle = new ShapeMatchPuzzle(this.scene, {
            ...config,
            onSolved: () => this.onPuzzleSolved(config, puzzle)
        });

        puzzle.create();
        this.activePuzzle = puzzle;
        this.startHintTimer(config);

        return puzzle;
    }

    /**
     * Criar modal básico
     */
    createModal(title) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #f0a500;
            border-radius: 10px;
            padding: 30px;
            max-width: 600px;
            width: 100%;
        `;

        const titleElem = document.createElement('h2');
        titleElem.textContent = title;
        titleElem.style.cssText = `
            color: #f0a500;
            text-align: center;
            margin: 0 0 20px 0;
        `;

        const closeBtn = this.createButton('Fechar', '#d32f2f');
        closeBtn.style.marginTop = '20px';
        closeBtn.onclick = () => this.closePuzzle();

        container.appendChild(titleElem);

        modal.appendChild(container);

        return {
            element: modal,
            content: container,
            closeButton: closeBtn
        };
    }

    /**
     * Criar botão estilizado
     */
    createButton(text, color = '#f0a500') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            padding: 12px 24px;
            background: ${color};
            color: #000;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        `;

        btn.onmouseenter = () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.opacity = '0.9';
        };

        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.opacity = '1';
        };

        return btn;
    }

    /**
     * Atualizar display de código
     */
    updateCodeDisplay(display, code, totalDigits) {
        const filled = code.padEnd(totalDigits, '−');
        display.textContent = filled.split('').join(' ');
    }

    /**
     * Mostrar dicas
     */
    showHints(container, config) {
        if (!config.hints || config.hints.length === 0) return;

        const hintsBtn = this.createButton('💡 Dica');
        hintsBtn.onclick = () => {
            const hint = config.hints[0];
            const msg = hint.text || hint;
            uiManager.showNotification(`💡 ${msg}`, 5000);
        };

        container.appendChild(hintsBtn);
    }

    /**
     * Timer de dicas automáticas
     */
    startHintTimer(config) {
        if (!config.hints || !config.autoHints) return;

        // Dica após 1 minuto
        this.hintTimer = setTimeout(() => {
            uiManager.showNotification('💡 ' + (config.hints[0]?.text || config.hints[0]), 6000);
        }, 60000);
    }

    /**
     * Puzzle resolvido
     */
    onPuzzleSolved(config, puzzleObj) {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
        }

        uiManager.showNotification('✅ Puzzle resolvido!');

        // Salvar no estado
        gameStateManager.solvePuzzle(config.id);

        // Atualizar visual do puzzle na cena (ex: baú fechado -> aberto)
        if (this.scene && typeof this.scene.renderPuzzle === 'function') {
            this.scene.renderPuzzle();
        }

        // Callback
        if (config.onSolved) {
            setTimeout(() => {
                config.onSolved();
            }, 1000);
        }

        // Fechar modal após delay
        setTimeout(() => {
            if (puzzleObj && puzzleObj.modal) {
                puzzleObj.modal.remove();
            }
            this.activePuzzle = null;
        }, 2000);
    }

    /**
     * Fechar puzzle
     */
    closePuzzle() {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
        }

        if (this.activePuzzle) {
            if (this.activePuzzle.destroy) {
                this.activePuzzle.destroy();
            } else if (this.activePuzzle.modal) {
                this.activePuzzle.modal.remove();
            }

            this.activePuzzle = null;
        }

        // Restaurar zoom da câmera se foi salvo
        if (this.savedCameraZoom && this.savedCameraZoom !== 1) {
            const camera = this.scene.cameras.main;
            camera.setZoom(this.savedCameraZoom);
            if (this.savedCameraScroll) {
                camera.scrollX = this.savedCameraScroll.x;
                camera.scrollY = this.savedCameraScroll.y;
            }
            this.savedCameraZoom = null;
            this.savedCameraScroll = null;
        }
    }

    /**
     * Verificar se há algum puzzle ativo
     */
    isAnyPuzzleActive() {
        return this.activePuzzle !== null;
    }
}
