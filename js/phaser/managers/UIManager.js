/**
 * UIManager
 * Gerencia interface HTML sobreposta ao Phaser (inventário, notificações, etc)
 */
const DEBUG_DRAG = true;
function debugDrag(...args) {
    if (DEBUG_DRAG) {
        console.log('[DRAG]', ...args);
    }
}

class UIManager {
    constructor() {
        // Inicializar propriedades ANTES de criar UI
        this.activeScene = null;
        this.draggedInventoryItem = null;
        this.dragPreview = null;
        this.boundHandleInventoryDragMove = this.handleInventoryDragMove.bind(this);
        this.boundEndInventoryDrag = this.endInventoryDrag.bind(this);
        this.inventoryWasOpenOnDrag = false;
        this.inventoryOverlay = null;
        this.puzzleOverlay = null;
        this.puzzleTitleEl = null;
        this.puzzleQuestionEl = null;
        this.puzzleHintEl = null;
        this.puzzleInputArea = null;
        this.puzzleMessageEl = null;
        this.puzzleSubmitBtn = null;
        this.puzzleCancelBtn = null;
        this.activePuzzleContext = null;
        this._ignoreNextPuzzleOverlayClick = false;

        // Criar UI (vai popular as propriedades acima)
        this.createUI();

        if (typeof gameStateManager !== 'undefined' && gameStateManager.on) {
            gameStateManager.on('inventoryChanged', () => this.renderInventory());
        }
    }

    createUI() {
        // Container principal da UI
        const uiContainer = document.createElement('div');
        uiContainer.id = 'phaser-ui';
        uiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(uiContainer);

        // Top bar
        this.createTopBar(uiContainer);

        // Notification area
        this.createNotificationArea(uiContainer);

        // Inventory overlay
        this.createInventoryOverlay(uiContainer);

        // Puzzle overlay
        this.createPuzzleOverlay(uiContainer);

        // Location info
        this.createLocationInfo(uiContainer);
    }

    createTopBar(container) {
        const topBar = document.createElement('div');
        topBar.id = 'top-bar';
        topBar.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%);
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 20px;
            pointer-events: auto;
        `;

        // Get user info from localStorage
        const username = localStorage.getItem('username') || 'Jogador';
        const isAdmin = localStorage.getItem('is_admin') === 'true';
        const adminBadge = isAdmin ? '<span style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px;">ADMIN</span>' : '';
        const adminButton = isAdmin ? '<a href="admin-panel.html" style="color: #f0a500; font-size: 14px; text-decoration: none; margin-left: 15px; padding: 5px 12px; border: 1px solid #f0a500; border-radius: 4px; transition: all 0.3s;" onmouseover="this.style.background=\'rgba(240,165,0,0.2)\'" onmouseout="this.style.background=\'transparent\'">← Admin</a>' : '';

        topBar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="color: #f0a500; font-size: 18px; font-weight: 600;">Vila Abandonada</div>
                ${adminButton}
                <div style="color: #ccc; font-size: 14px; display: flex; align-items: center;">
                    👤 <span id="username-display" style="margin-left: 5px;">${username}</span>${adminBadge}
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-inventory" class="phaser-btn" title="Inventário">🎒</button>
                <button id="btn-save" class="phaser-btn" title="Salvar">💾</button>
                <button id="btn-reset" class="phaser-btn" title="Resetar">🔄</button>
                <button id="btn-logout" class="phaser-btn phaser-btn-logout" title="Sair">🚪</button>
            </div>
        `;

        container.appendChild(topBar);

        // Botão styles
        const style = document.createElement('style');
        style.textContent = `
            .phaser-btn {
                background: rgba(240, 165, 0, 0.2);
                border: 2px solid #f0a500;
                color: #f0a500;
                font-size: 20px;
                width: 40px;
                height: 40px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            }
            .phaser-btn:hover {
                background: rgba(240, 165, 0, 0.4);
                transform: scale(1.1);
            }
            .phaser-btn-logout {
                background: rgba(244, 67, 54, 0.2);
                border-color: #f44336;
                color: #f44336;
            }
            .phaser-btn-logout:hover {
                background: rgba(244, 67, 54, 0.4);
            }
            .phaser-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                justify-content: center;
                align-items: center;
                pointer-events: auto;
                z-index: 10000;
            }
            .phaser-overlay.active {
                display: flex;
                pointer-events: auto;
            }
            .phaser-overlay-content {
                background: #1a1a1a;
                border: 2px solid #f0a500;
                border-radius: 12px;
                padding: 30px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                position: relative;
                pointer-events: auto;
                z-index: 10001;
            }
            .phaser-close-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #f44336;
                border: none;
                color: white;
                font-size: 24px;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                cursor: pointer;
                line-height: 1;
            }
            .inventory-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 15px;
                margin-top: 20px;
            }
            .inventory-item {
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid #444;
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                transition: all 0.3s;
            }
            .inventory-item:hover {
                border-color: #f0a500;
                transform: scale(1.05);
            }
            .inventory-item img {
                max-width: 60px;
                max-height: 60px;
                margin-bottom: 8px;
                image-rendering: crisp-edges;
            }
            .inventory-item-name {
                color: #f0a500;
                font-size: 12px;
                font-weight: 600;
            }
            .inventory-drag-preview {
                position: fixed;
                pointer-events: none;
                z-index: 2000;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.75);
                border: 2px solid #f0a500;
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.45);
            }
            .inventory-drag-preview img {
                max-width: 64px;
                max-height: 64px;
                display: block;
            }
            .inventory-drag-preview span {
                display: block;
                color: #f0a500;
                font-size: 22px;
            }
            .puzzle-modal {
                max-width: 520px;
                width: min(90vw, 460px);
                background: linear-gradient(180deg, rgba(26,26,26,0.95) 0%, rgba(15,15,15,0.95) 100%);
                border: 2px solid #f0a500;
                border-radius: 16px;
                padding: 32px 28px 28px;
                color: #f5ede1;
                box-shadow: 0 20px 40px rgba(0,0,0,0.65);
            }
            .puzzle-modal h2 {
                font-size: 24px;
                margin-bottom: 12px;
                color: #f0a500;
            }
            .puzzle-question {
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 18px;
                color: #f5ede1;
            }
            .puzzle-hint {
                font-size: 14px;
                margin-bottom: 20px;
                color: #f1c27d;
            }
            .puzzle-input-area {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .puzzle-input {
                background: rgba(0, 0, 0, 0.55);
                border: 1px solid rgba(240, 165, 0, 0.35);
                border-radius: 8px;
                padding: 12px 14px;
                font-size: 18px;
                color: #ffffff;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
                pointer-events: auto;
            }
            .puzzle-input:focus {
                border-color: #f0a500;
                box-shadow: 0 0 0 2px rgba(240, 165, 0, 0.18);
            }
            .puzzle-actions {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-top: 24px;
            }
            .phaser-btn-primary,
            .phaser-btn-secondary {
                padding: 10px 18px;
                border-radius: 8px;
                border: 2px solid transparent;
                font-size: 16px;
                cursor: pointer;
                transition: transform 0.2s, background 0.2s, border-color 0.2s;
                pointer-events: auto;
            }
            .phaser-btn-primary {
                background: linear-gradient(135deg, #f0a500, #f5c75a);
                color: #1a1a1a;
                border-color: #f5c75a;
            }
            .phaser-btn-primary:hover {
                transform: translateY(-1px);
            }
            .phaser-btn-secondary {
                background: rgba(255, 255, 255, 0.08);
                color: #f5ede1;
                border-color: rgba(255, 255, 255, 0.18);
            }
            .phaser-btn-secondary:hover {
                transform: translateY(-1px);
                background: rgba(255, 255, 255, 0.12);
            }
            .phaser-btn-primary:disabled,
            .phaser-btn-secondary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .phaser-btn-primary.disabled,
            .phaser-btn-secondary.disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .puzzle-message {
                margin-top: 16px;
                font-size: 15px;
                min-height: 22px;
                color: #f5ede1;
            }
            .puzzle-message.success {
                color: #6df58f;
            }
            .puzzle-message.error {
                color: #ff8484;
            }
            .puzzle-choice-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .puzzle-choice-btn {
                background: rgba(255, 255, 255, 0.08);
                border: 2px solid rgba(255, 255, 255, 0.12);
                border-radius: 10px;
                color: #f5ede1;
                font-size: 16px;
                padding: 12px 16px;
                text-align: left;
                cursor: pointer;
                transition: transform 0.15s, border-color 0.15s, background 0.15s;
                pointer-events: auto;
            }
            .puzzle-choice-btn:hover {
                transform: translateY(-1px);
                border-color: rgba(240, 165, 0, 0.6);
            }
            .puzzle-choice-btn.selected {
                border-color: #f0a500;
                background: rgba(240, 165, 0, 0.18);
                color: #ffe8b3;
            }
            .puzzle-helper {
                font-size: 14px;
                color: #d5c5a5;
            }
            .puzzle-sequence-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 8px;
            }
            .puzzle-sequence-btn {
                padding: 10px 14px;
                border-radius: 8px;
                border: 2px solid rgba(255, 255, 255, 0.18);
                background: rgba(255, 255, 255, 0.07);
                color: #f5ede1;
                cursor: pointer;
                transition: transform 0.15s, border-color 0.15s, background 0.15s;
                pointer-events: auto;
            }
            .puzzle-sequence-btn:hover {
                transform: translateY(-1px);
                border-color: rgba(240, 165, 0, 0.6);
            }
            .puzzle-sequence-display {
                margin-top: 14px;
                font-size: 15px;
                color: #f5ede1;
                min-height: 22px;
            }
            .puzzle-sequence-display span {
                color: #f0a500;
                font-weight: 600;
            }
            .puzzle-sequence-actions {
                margin-top: 12px;
                display: flex;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);

        // Event listeners
        document.getElementById('btn-inventory').addEventListener('click', () => this.toggleInventory());
        document.getElementById('btn-save').addEventListener('click', () => this.saveGame());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
        document.getElementById('btn-logout').addEventListener('click', () => this.logout());
    }

    createNotificationArea(container) {
        const notifArea = document.createElement('div');
        notifArea.id = 'notification';
        notifArea.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(240, 165, 0, 0.95);
            color: #000;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
            max-width: 80%;
            text-align: center;
        `;
        container.appendChild(notifArea);
    }

    createInventoryOverlay(container) {
        const overlay = document.createElement('div');
        overlay.id = 'inventory-overlay';
        overlay.className = 'phaser-overlay';
        overlay.innerHTML = `
            <div class="phaser-overlay-content">
                <button class="phaser-close-btn" onclick="uiManager.toggleInventory()">✕</button>
                <h2 style="color: #f0a500; margin-bottom: 10px;">Inventário</h2>
                <div id="inventory-grid" class="inventory-grid"></div>
                <div id="inventory-empty" style="color: #999; text-align: center; padding: 40px; display: none;">
                    Seu inventário está vazio
                </div>
            </div>
        `;
        container.appendChild(overlay);
        this.inventoryOverlay = overlay;
    }

    createPuzzleOverlay(container) {
        console.log('[PUZZLE][UI][INIT]', 'Criando puzzle overlay...');
        const overlay = document.createElement('div');
        overlay.id = 'puzzle-overlay';
        overlay.className = 'phaser-overlay';
        console.log('[PUZZLE][UI][INIT]', 'Overlay criado:', overlay);

        const modal = document.createElement('div');
        modal.className = 'phaser-overlay-content puzzle-modal';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'phaser-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.closePuzzleOverlay('close-button'));

        const title = document.createElement('h2');
        title.textContent = 'Enigma';

        const question = document.createElement('p');
        question.className = 'puzzle-question';

        const hint = document.createElement('div');
        hint.className = 'puzzle-hint';

        const inputArea = document.createElement('div');
        inputArea.className = 'puzzle-input-area';

        const message = document.createElement('div');
        message.className = 'puzzle-message';

        const actions = document.createElement('div');
        actions.className = 'puzzle-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'phaser-btn-secondary';
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => this.closePuzzleOverlay('cancel'));

        const submitBtn = document.createElement('button');
        submitBtn.className = 'phaser-btn-primary';
        submitBtn.type = 'button';
        submitBtn.textContent = 'Confirmar';
        submitBtn.addEventListener('click', () => this.submitActivePuzzle());

        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);

        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(question);
        modal.appendChild(hint);
        modal.appendChild(inputArea);
        modal.appendChild(message);
        modal.appendChild(actions);

        overlay.appendChild(modal);
        container.appendChild(overlay);

        overlay.addEventListener('click', (event) => {
            if (event.target !== overlay) return;
            if (this._ignoreNextPuzzleOverlayClick) {
                this._ignoreNextPuzzleOverlayClick = false;
                return;
            }
            this.closePuzzleOverlay('backdrop');
        });

        this.puzzleOverlay = overlay;
        this.puzzleTitleEl = title;
        this.puzzleQuestionEl = question;
        this.puzzleHintEl = hint;
        this.puzzleInputArea = inputArea;
        this.puzzleMessageEl = message;
        this.puzzleSubmitBtn = submitBtn;
        this.puzzleCancelBtn = cancelBtn;

        console.log('[PUZZLE][UI][INIT]', 'Elementos salvos:', {
            overlay: !!this.puzzleOverlay,
            title: !!this.puzzleTitleEl,
            question: !!this.puzzleQuestionEl,
            hint: !!this.puzzleHintEl,
            inputArea: !!this.puzzleInputArea,
            message: !!this.puzzleMessageEl,
            submitBtn: !!this.puzzleSubmitBtn,
            cancelBtn: !!this.puzzleCancelBtn
        });
    }

    createLocationInfo(container) {
        const locationInfo = document.createElement('div');
        locationInfo.id = 'location-info';
        locationInfo.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
            padding: 20px;
            pointer-events: none;
        `;
        locationInfo.innerHTML = `
            <h2 id="location-name" style="color: #f0a500; font-size: 28px; margin-bottom: 8px;"></h2>
            <p id="location-description" style="color: #ccc; font-size: 16px; line-height: 1.5;"></p>
        `;
        container.appendChild(locationInfo);
    }

    /**
     * Mostrar notificação
     */
    showNotification(message, duration = 3000) {
        const notif = document.getElementById('notification');
        notif.textContent = message;
        notif.style.opacity = '1';

        setTimeout(() => {
            notif.style.opacity = '0';
        }, duration);
    }

    /**
     * Atualizar informações do local
     */
    updateLocationInfo(location) {
        document.getElementById('location-name').textContent = location.name;
        document.getElementById('location-description').textContent = location.description;
    }

    setActiveScene(scene) {
        this.activeScene = scene;
    }

    /**
     * Toggle inventário
     */
    toggleInventory() {
        const overlay = this.inventoryOverlay || document.getElementById('inventory-overlay');
        if (!overlay) return;
        const isActive = overlay.classList.contains('active');

        if (isActive) {
            overlay.classList.remove('active');
            // Reabilitar input do Phaser quando inventário fecha
            if (this.activeScene && this.activeScene.input) {
                this.activeScene.input.enabled = true;
            }
        } else {
            this.renderInventory();
            overlay.classList.add('active');
            // Desabilitar input do Phaser quando inventário abre
            if (this.activeScene && this.activeScene.input) {
                this.activeScene.input.enabled = false;
            }
        }
    }

    /**
     * Renderizar inventário
     */
    renderInventory() {
        const items = gameStateManager.getInventoryArray();
        const grid = document.getElementById('inventory-grid');
        const empty = document.getElementById('inventory-empty');

        if (items.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        empty.style.display = 'none';

        grid.innerHTML = '';

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.dataset.itemId = item.id;

            if (item.image) {
                const img = document.createElement('img');
                img.src = item.image;
                img.alt = item.name;
                itemDiv.appendChild(img);
            } else {
                const placeholder = document.createElement('span');
                placeholder.textContent = '📦';
                placeholder.style.fontSize = '32px';
                itemDiv.appendChild(placeholder);
            }

            const label = document.createElement('div');
            label.className = 'inventory-item-name';
            label.textContent = item.name;
            itemDiv.appendChild(label);

        itemDiv.addEventListener('pointerdown', (event) => this.startInventoryDrag(item, event));
        itemDiv.addEventListener('touchstart', (event) => this.startInventoryDrag(item, event), { passive: false });

            grid.appendChild(itemDiv);
        });
    }

    resetPuzzleOverlay() {
        if (this.puzzleSubmitBtn) {
            this.puzzleSubmitBtn.disabled = false;
        }
        if (this.puzzleCancelBtn) {
            this.puzzleCancelBtn.disabled = false;
        }
        if (this.puzzleMessageEl) {
            this.puzzleMessageEl.textContent = '';
            this.puzzleMessageEl.className = 'puzzle-message';
        }
    }

    openPuzzleDialog(puzzle, options = {}) {
        console.log('[PUZZLE][UI][DEBUG]', 'openPuzzleDialog chamado', {
            puzzle,
            options,
            hasOverlay: !!this.puzzleOverlay,
            hasTitleEl: !!this.puzzleTitleEl,
            hasQuestionEl: !!this.puzzleQuestionEl,
            hasHintEl: !!this.puzzleHintEl,
            hasInputArea: !!this.puzzleInputArea
        });

        if (!puzzle || !this.puzzleOverlay) {
            console.error('[PUZZLE][UI]', 'Puzzle ou overlay ausente!', { puzzle, overlay: this.puzzleOverlay });
            return;
        }

        if (this.activePuzzleContext) {
            this.closePuzzleOverlay('replace');
        }

        this.resetPuzzleOverlay();
        if (this.puzzleInputArea) {
            this.puzzleInputArea.innerHTML = '';
        }

        if (this.puzzleOverlay) {
            console.log('[PUZZLE][UI]', 'ativando overlay', {
                beforeInline: this.puzzleOverlay.style.display,
                hasActive: this.puzzleOverlay.classList.contains('active')
            });
            this.puzzleOverlay.classList.add('active');
            this.puzzleOverlay.style.display = 'flex';
            this.puzzleOverlay.style.pointerEvents = 'auto';
        }

        const puzzleType = (puzzle.type ?? '').toString().trim().toLowerCase();
        console.log('[PUZZLE][UI]', 'abrindo modal', {
            id: puzzle.id,
            type: puzzleType,
            question: puzzle.question,
            options: puzzle.options,
            reward: puzzle.reward
        });
        const context = {
            puzzle,
            onSubmit: typeof options.onSubmit === 'function' ? options.onSubmit : null,
            onSolved: typeof options.onSolved === 'function' ? options.onSolved : null,
            onClose: typeof options.onClose === 'function' ? options.onClose : null,
            primaryInput: null,
            buildPayload: null,
            validateBeforeSubmit: null,
            state: {}
        };
        this.activePuzzleContext = context;

        context.type = puzzleType;

        if (this.puzzleTitleEl) {
            const title = options.title || puzzle.title || puzzle.name || 'Enigma';
            console.log('[PUZZLE][UI][DEBUG]', 'Definindo título:', title);
            this.puzzleTitleEl.textContent = title;
            console.log('[PUZZLE][UI][DEBUG]', 'Título definido, textContent:', this.puzzleTitleEl.textContent);
        } else {
            console.error('[PUZZLE][UI]', 'puzzleTitleEl não existe!');
        }

        if (this.puzzleQuestionEl) {
            const question = puzzle.question || 'Resolva o enigma para continuar.';
            console.log('[PUZZLE][UI][DEBUG]', 'Definindo pergunta:', question);
            console.log('[PUZZLE][UI][DEBUG]', 'puzzle.question original:', puzzle.question);
            console.log('[PUZZLE][UI][DEBUG]', 'typeof puzzle.question:', typeof puzzle.question);
            console.log('[PUZZLE][UI][DEBUG]', 'puzzle completo:', JSON.stringify(puzzle, null, 2));
            this.puzzleQuestionEl.textContent = question;
            console.log('[PUZZLE][UI][DEBUG]', 'Pergunta definida, textContent:', this.puzzleQuestionEl.textContent);
            console.log('[PUZZLE][UI][DEBUG]', 'Elemento HTML:', this.puzzleQuestionEl);
        } else {
            console.error('[PUZZLE][UI]', 'puzzleQuestionEl não existe!');
        }

        if (this.puzzleHintEl) {
            if (puzzle.hint) {
                this.puzzleHintEl.style.display = 'block';
                this.puzzleHintEl.textContent = `Dica: ${puzzle.hint}`;
                console.log('[PUZZLE][UI][DEBUG]', 'Dica definida:', puzzle.hint);
            } else {
                this.puzzleHintEl.style.display = 'none';
                this.puzzleHintEl.textContent = '';
                console.log('[PUZZLE][UI][DEBUG]', 'Sem dica');
            }
        } else {
            console.error('[PUZZLE][UI]', 'puzzleHintEl não existe!');
        }

        this.setPuzzleMessage('');

        const setSubmitEnabled = (enabled) => {
            if (this.puzzleSubmitBtn) {
                this.puzzleSubmitBtn.disabled = !enabled;
                this.puzzleSubmitBtn.classList.toggle('disabled', !enabled);
            }
        };

        const addHelperText = (text) => {
            if (!this.puzzleInputArea) return;
            const helper = document.createElement('div');
            helper.className = 'puzzle-helper';
            helper.textContent = text;
            this.puzzleInputArea.appendChild(helper);
            return helper;
        };

        const optionsArray = Array.isArray(puzzle.options) ? puzzle.options : [];
        console.log('[PUZZLE][UI]', 'optionsArray', optionsArray);

        if (puzzleType === 'code' || puzzleType === 'math') {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'puzzle-input';
            input.placeholder = options.placeholder || (puzzleType === 'code' ? 'Digite o código' : 'Digite a resposta');
            input.maxLength = 32;
            if (puzzleType === 'code') {
                input.inputMode = 'numeric';
                input.pattern = '[0-9]*';
            }
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.submitActivePuzzle();
                }
            });
            this.puzzleInputArea?.appendChild(input);
            context.primaryInput = input;
            context.buildPayload = () => ({ answer: input.value });
            setSubmitEnabled(Boolean(context.onSubmit));
            setTimeout(() => input.focus(), 60);
        } else if (puzzleType === 'direction' || puzzleType === 'riddle') {
            if (!optionsArray.length) {
                addHelperText('Nenhuma opção configurada para este enigma.');
                setSubmitEnabled(false);
                context.validateBeforeSubmit = () => ({ valid: false, message: 'Enigma sem opções configuradas.' });
            } else {
                setSubmitEnabled(false);
                const list = document.createElement('div');
                list.className = 'puzzle-choice-list';
                const buttons = [];
                optionsArray.forEach((optionLabel, index) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'puzzle-choice-btn';
                    btn.textContent = optionLabel;
                    btn.addEventListener('click', () => {
                        context.state.selectedIndex = index;
                        buttons.forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        setSubmitEnabled(true);
                        this.puzzleSubmitBtn?.focus();
                        this.setPuzzleMessage('');
                    });
                    buttons.push(btn);
                    list.appendChild(btn);
                });
                this.puzzleInputArea?.appendChild(list);
                context.buildPayload = () => ({ selectedIndex: context.state.selectedIndex });
                context.validateBeforeSubmit = () => {
                    if (context.state.selectedIndex === undefined) {
                        return { valid: false, message: 'Selecione uma opção.' };
                    }
                    return { valid: true };
                };
            }
        } else if (puzzleType === 'sequence_symbols') {
            if (!optionsArray.length) {
                addHelperText('Nenhum símbolo configurado para este enigma.');
                setSubmitEnabled(false);
                context.validateBeforeSubmit = () => ({ valid: false, message: 'Enigma sem símbolos configurados.' });
            } else {
                context.state.sequence = [];
                setSubmitEnabled(false);
                addHelperText('Clique nos símbolos na ordem correta.');

                const optionsWrap = document.createElement('div');
                optionsWrap.className = 'puzzle-sequence-options';

                const updateDisplay = () => {
                    if (!sequenceDisplay) return;
                    if (!context.state.sequence.length) {
                        sequenceDisplay.innerHTML = '<strong>Sequência:</strong> <span>Nenhum</span>';
                    } else {
                        const items = context.state.sequence
                            .map(idx => optionsArray[idx] ?? `#${idx + 1}`)
                            .map(label => `<span>${label}</span>`);
                        sequenceDisplay.innerHTML = `<strong>Sequência:</strong> ${items.join(' → ')}`;
                    }
                };

                optionsArray.forEach((label, index) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'puzzle-sequence-btn';
                    btn.textContent = label;
                    btn.addEventListener('click', () => {
                        context.state.sequence.push(index);
                        updateDisplay();
                        setSubmitEnabled(true);
                        this.puzzleSubmitBtn?.focus();
                        this.setPuzzleMessage('');
                    });
                    optionsWrap.appendChild(btn);
                });
                this.puzzleInputArea?.appendChild(optionsWrap);

                const sequenceDisplay = document.createElement('div');
                sequenceDisplay.className = 'puzzle-sequence-display';
                this.puzzleInputArea?.appendChild(sequenceDisplay);
                updateDisplay();

                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'puzzle-sequence-actions';
                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'phaser-btn-secondary';
                clearBtn.textContent = 'Limpar';
                clearBtn.addEventListener('click', () => {
                    context.state.sequence = [];
                    updateDisplay();
                    setSubmitEnabled(false);
                    this.setPuzzleMessage('');
                });
                actionsWrap.appendChild(clearBtn);
                this.puzzleInputArea?.appendChild(actionsWrap);

                context.buildPayload = () => ({ sequence: Array.from(context.state.sequence) });
                context.validateBeforeSubmit = () => {
                    if (!context.state.sequence.length) {
                        return { valid: false, message: 'Selecione ao menos um símbolo.' };
                    }
                    return { valid: true };
                };
            }
        } else {
            const unsupported = document.createElement('div');
            unsupported.style.fontSize = '15px';
            unsupported.style.color = '#ffb57d';
            unsupported.textContent = 'Este tipo de enigma ainda não está disponível nesta versão.';
            this.puzzleInputArea?.appendChild(unsupported);
            setSubmitEnabled(false);
            context.validateBeforeSubmit = () => ({ valid: false, message: 'Enigma não suportado.' });
        }

        if (this.puzzleOverlay) {
            this.puzzleOverlay.classList.add('active');
            this.puzzleOverlay.style.display = 'flex';
            this.puzzleOverlay.style.pointerEvents = 'auto';
        }
        if (!this.activePuzzleContext?.onSubmit) {
            setSubmitEnabled(false);
        }
        console.log('[PUZZLE]', 'overlay ativo');
        this._ignoreNextPuzzleOverlayClick = true;
        setTimeout(() => {
            this._ignoreNextPuzzleOverlayClick = false;
        }, 150);

        // Desabilitar input do Phaser para evitar cliques atravessando o overlay
        if (this.activeScene && this.activeScene.input) {
            console.log('[PUZZLE][UI]', 'Desabilitando input do Phaser');
            this.activeScene.input.enabled = false;
        }
    }

    closePuzzleOverlay(reason = 'cancel') {
        const ctx = this.activePuzzleContext;
        console.log('[PUZZLE][UI]', 'closePuzzleOverlay', reason);
        this.activePuzzleContext = null;
        this._ignoreNextPuzzleOverlayClick = false;
        if (this.puzzleOverlay) {
            this.puzzleOverlay.classList.remove('active');
            this.puzzleOverlay.style.display = 'none';
            this.puzzleOverlay.style.pointerEvents = 'none';
        }
        if (this.puzzleInputArea) {
            this.puzzleInputArea.innerHTML = '';
        }
        this.resetPuzzleOverlay();

        // Reabilitar input do Phaser
        if (this.activeScene && this.activeScene.input) {
            console.log('[PUZZLE][UI]', 'Reabilitando input do Phaser');
            this.activeScene.input.enabled = true;
        }

        if (ctx && typeof ctx.onClose === 'function') {
            try {
                ctx.onClose(reason);
            } catch (error) {
                console.error('Erro no callback onClose do enigma:', error);
            }
        }
    }

    setPuzzleMessage(message, type = '') {
        if (!this.puzzleMessageEl) return;
        const classList = ['puzzle-message'];
        if (type) {
            classList.push(type);
        }
        this.puzzleMessageEl.className = classList.join(' ');
        this.puzzleMessageEl.textContent = message || '';
    }

    async submitActivePuzzle() {
        const ctx = this.activePuzzleContext;
        if (!ctx || typeof ctx.onSubmit !== 'function') {
            return;
        }

        if (this.puzzleSubmitBtn?.disabled) {
            return;
        }

        this.setPuzzleMessage('');

        let payload = {};
        if (ctx.buildPayload) {
            payload = ctx.buildPayload() || {};
        } else if (ctx.puzzle.type === 'code' || ctx.puzzle.type === 'math') {
            payload = { answer: ctx.primaryInput ? ctx.primaryInput.value : '' };
        }
        console.log('[PUZZLE][UI]', 'submitActivePuzzle', { payload, type: ctx.type, puzzleId: ctx.puzzle?.id });

        if (ctx.validateBeforeSubmit) {
            const validation = ctx.validateBeforeSubmit(payload);
            if (!validation || validation.valid === false) {
                if (validation?.message) {
                    this.setPuzzleMessage(validation.message, 'error');
                }
                console.log('[PUZZLE][UI]', 'validation falhou', validation);
                return;
            }
        }

        if (this.puzzleSubmitBtn) {
            this.puzzleSubmitBtn.disabled = true;
        }
        if (this.puzzleCancelBtn) {
            this.puzzleCancelBtn.disabled = true;
        }
        if (ctx.primaryInput) {
            ctx.primaryInput.disabled = true;
        }

        let result;
        try {
            result = await ctx.onSubmit(payload);
        } catch (error) {
            console.error('Erro ao processar resposta do enigma:', error);
            result = { success: false, message: 'Erro ao processar o enigma.' };
        }

        if (this.activePuzzleContext !== ctx) {
            return;
        }

        if (!result) {
            result = { success: false, message: 'Resposta inválida.' };
        }

        console.log('[PUZZLE][UI]', 'resultado', result);

        if (result.success) {
            this.setPuzzleMessage(result.message || 'Enigma resolvido!', 'success');
            if (typeof ctx.onSolved === 'function') {
                try {
                    ctx.onSolved(result);
                } catch (error) {
                    console.error('Erro no callback onSolved do enigma:', error);
                }
            }
            const delay = typeof result.closeDelay === 'number' ? result.closeDelay : 1200;
            setTimeout(() => this.closePuzzleOverlay('success'), delay);
        } else {
            this.setPuzzleMessage(result.message || 'Resposta incorreta.', 'error');
            if (ctx.primaryInput) {
                ctx.primaryInput.disabled = false;
                ctx.primaryInput.focus();
                ctx.primaryInput.select?.();
            }
            if (this.puzzleSubmitBtn) {
                this.puzzleSubmitBtn.disabled = false;
            }
            if (this.puzzleCancelBtn) {
                this.puzzleCancelBtn.disabled = false;
            }
        }
    }

    startInventoryDrag(item, event) {
        const coords = this.getEventCoords(event);
        if (!coords) return;

        event.preventDefault();
        event.stopPropagation();

        this.draggedInventoryItem = {
            item,
            pointerId: coords.pointerId,
            lastX: coords.x,
            lastY: coords.y,
            loggedMove: false
        };

        debugDrag('start', {
            itemId: item.id,
            pointerId: coords.pointerId,
            x: coords.x,
            y: coords.y
        });

        if (this.dragPreview) {
            this.dragPreview.remove();
        }

        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'inventory-drag-preview';

        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            this.dragPreview.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = item.name?.charAt(0) || '🎒';
            this.dragPreview.appendChild(span);
        }

        document.body.appendChild(this.dragPreview);
        if (this.dragPreview instanceof HTMLElement) {
            this.dragPreview.style.pointerEvents = 'none';
        }
        this.updateDragPreviewPosition(coords.x, coords.y);
        this.dragPreview.dataset.dragging = 'true';

        const overlay = this.inventoryOverlay || document.getElementById('inventory-overlay');
        this.inventoryWasOpenOnDrag = !!(overlay && overlay.classList.contains('active'));
        if (this.inventoryWasOpenOnDrag && overlay) {
            overlay.classList.remove('active');
        }

        document.addEventListener('pointermove', this.boundHandleInventoryDragMove, { passive: false });
        document.addEventListener('pointerup', this.boundEndInventoryDrag, { passive: false });
        document.addEventListener('pointercancel', this.boundEndInventoryDrag, { passive: false });
        document.addEventListener('touchmove', this.boundHandleInventoryDragMove, { passive: false });
        document.addEventListener('touchend', this.boundEndInventoryDrag, { passive: false });
        document.addEventListener('touchcancel', this.boundEndInventoryDrag, { passive: false });
        document.addEventListener('mouseup', this.boundEndInventoryDrag, { passive: false });
        window.addEventListener('pointerup', this.boundEndInventoryDrag, { passive: false });
        window.addEventListener('pointercancel', this.boundEndInventoryDrag, { passive: false });
        window.addEventListener('mouseup', this.boundEndInventoryDrag, { passive: false });
        window.addEventListener('touchend', this.boundEndInventoryDrag, { passive: false });
        window.addEventListener('touchcancel', this.boundEndInventoryDrag, { passive: false });
    }

    handleInventoryDragMove(event) {
        if (!this.draggedInventoryItem) return;

        const coords = this.getEventCoords(event, this.draggedInventoryItem.pointerId);
        if (!coords) return;

        event.preventDefault();
        this.draggedInventoryItem.lastX = coords.x;
        this.draggedInventoryItem.lastY = coords.y;
        this.updateDragPreviewPosition(coords.x, coords.y);

        if (this.dragPreview) {
            this.dragPreview.dataset.dragging = 'true';
        }

        if (!this.draggedInventoryItem.loggedMove) {
            debugDrag('move', {
                itemId: this.draggedInventoryItem.item.id,
                pointerId: this.draggedInventoryItem.pointerId,
                x: coords.x,
                y: coords.y
            });
            this.draggedInventoryItem.loggedMove = true;
        }
    }

    endInventoryDrag(event) {
        if (!this.draggedInventoryItem) return;

        const dragContext = this.draggedInventoryItem;
        debugDrag('end-event-received', {
            eventType: event?.type,
            eventPointerId: event?.pointerId ?? null,
            trackedPointerId: dragContext.pointerId,
            targetTag: event?.target?.tagName || null,
            targetId: event?.target?.id || null,
            targetClass: event?.target?.className || null,
            isTouchEvent: event instanceof TouchEvent,
            changedTouches: event instanceof TouchEvent ? event.changedTouches.length : undefined
        });

        const overlay = this.inventoryOverlay || document.getElementById('inventory-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            // Reabilitar input do Phaser quando inventário fecha por drag
            if (this.activeScene && this.activeScene.input) {
                this.activeScene.input.enabled = true;
            }
        }
        this.inventoryWasOpenOnDrag = false;

        const cleanup = (reason, extra = {}) => {
            if (this.dragPreview) {
                this.dragPreview.remove();
                this.dragPreview = null;
            }
            this.detachInventoryDragListeners();
            debugDrag('cleanup', {
                reason,
                itemId: dragContext.item.id,
                ...extra
            });
            this.draggedInventoryItem = null;
        };

        const coords = this.getEventCoords(event, dragContext.pointerId);
        if (!coords) {
            cleanup('coords-missing', {
                eventType: event.type,
                pointerId: event.pointerId ?? null,
                trackedPointerId: dragContext.pointerId
            });
            return;
        }

        event.preventDefault();

        if (this.dragPreview) {
            this.dragPreview.dataset.dragging = 'false';
        }

        if (typeof game === 'undefined' || !game || !game.canvas) {
            cleanup('missing-game', {
                eventType: event.type,
                hasGlobalGame: typeof game !== 'undefined',
                canvasAvailable: !!game?.canvas
            });
            return;
        }

        const rect = game.canvas.getBoundingClientRect();
        const inside = coords.x >= rect.left && coords.x <= rect.right &&
            coords.y >= rect.top && coords.y <= rect.bottom;

        debugDrag('end', {
            itemId: dragContext.item.id,
            pointerId: coords.pointerId,
            x: coords.x,
            y: coords.y,
            insideCanvas: inside,
            pointerMismatch: !!coords.pointerMismatch,
            originalPointerId: dragContext.pointerId
        });

        let dropResult = 'cancelled';

        if (inside && this.activeScene && typeof this.activeScene.handleInventoryDrop === 'function') {
            const pointerPosition = {
                x: coords.x,
                y: coords.y
            };
            debugDrag('drop', {
                itemId: dragContext.item.id,
                pointerPosition,
                location: this.activeScene?.currentLocation
            });
            try {
                this.activeScene.handleInventoryDrop(dragContext.item.id, pointerPosition);
                dropResult = 'dispatched';
            } catch (err) {
                console.error('Erro ao processar drop:', err);
                dropResult = 'handler-error';
            }
        } else {
            dropResult = inside ? 'no-handler' : 'outside-canvas';
            debugDrag('drop-cancelled', {
                itemId: dragContext.item.id,
                insideCanvas: inside
            });
            if (!inside) {
                uiManager.showNotification('Solte o item sobre a cena.', 2500);
            }
        }

        cleanup('completed', { dropResult, insideCanvas: inside });
    }

    detachInventoryDragListeners() {
        debugDrag('listeners-detached');
        document.removeEventListener('pointermove', this.boundHandleInventoryDragMove);
        document.removeEventListener('pointerup', this.boundEndInventoryDrag);
        document.removeEventListener('pointercancel', this.boundEndInventoryDrag);
        document.removeEventListener('touchmove', this.boundHandleInventoryDragMove);
        document.removeEventListener('touchend', this.boundEndInventoryDrag);
        document.removeEventListener('touchcancel', this.boundEndInventoryDrag);
        document.removeEventListener('mouseup', this.boundEndInventoryDrag);
        window.removeEventListener('pointerup', this.boundEndInventoryDrag);
        window.removeEventListener('pointercancel', this.boundEndInventoryDrag);
        window.removeEventListener('mouseup', this.boundEndInventoryDrag);
        window.removeEventListener('touchend', this.boundEndInventoryDrag);
        window.removeEventListener('touchcancel', this.boundEndInventoryDrag);
    }

    getEventCoords(event, trackedPointerId = null) {
        if (event instanceof TouchEvent) {
            const touches = Array.from(event.changedTouches);
            let touch = null;
            if (trackedPointerId !== null) {
                touch = touches.find(t => t.identifier === trackedPointerId);
                if (!touch && touches[0]) {
                    debugDrag('coords-touch-fallback', {
                        eventType: event.type,
                        trackedPointerId,
                        fallbackId: touches[0].identifier,
                        totalTouches: touches.length
                    });
                    touch = touches[0];
                }
            } else {
                touch = touches[0];
            }
            if (!touch) return null;
            return {
                x: touch.clientX,
                y: touch.clientY,
                pointerId: touch.identifier,
                pointerMismatch: trackedPointerId !== null && touch.identifier !== trackedPointerId
            };
        }

        if (event.button !== undefined && event.type === 'pointerdown' && event.button !== 0) {
            return null;
        }

        if (trackedPointerId !== null && event.pointerId !== undefined && event.pointerId !== trackedPointerId) {
            debugDrag('coords-pointer-mismatch', {
                eventType: event.type,
                eventPointerId: event.pointerId,
                trackedPointerId,
                buttons: event.buttons,
                button: event.button
            });
            return {
                x: event.clientX,
                y: event.clientY,
                pointerId: event.pointerId,
                pointerMismatch: true
            };
        }

        return {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId ?? 0
        };
    }

    updateDragPreviewPosition(x, y) {
        if (!this.dragPreview) return;
        this.dragPreview.style.left = `${x}px`;
        this.dragPreview.style.top = `${y}px`;
    }

    /**
     * Salvar jogo
     */
    saveGame() {
        gameStateManager.saveProgress();
        this.showNotification('✓ Jogo salvo!');
    }

    /**
     * Resetar jogo
     */
    resetGame() {
        if (confirm('Tem certeza que deseja resetar o jogo? Todo progresso será perdido.')) {
            gameStateManager.reset();
            this.showNotification('✓ Jogo resetado!');
            window.location.reload();
        }
    }

    /**
     * Logout
     */
    logout() {
        if (confirm('Deseja realmente sair do jogo?')) {
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            localStorage.removeItem('is_admin');
            window.location.href = 'index.html';
        }
    }
}

// Instância global
const uiManager = new UIManager();
window.uiManager = uiManager;
