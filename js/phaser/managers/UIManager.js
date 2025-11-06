/**
 * UIManager
 * Gerencia interface HTML sobreposta ao Phaser (inventário, notificações, etc)
 */
class UIManager {
    constructor() {
        this.createUI();
        this.activeScene = null;
        this.draggedInventoryItem = null;
        this.dragPreview = null;
        this.boundHandleInventoryDragMove = this.handleInventoryDragMove.bind(this);
        this.boundEndInventoryDrag = this.endInventoryDrag.bind(this);
        this.inventoryWasOpenOnDrag = false;
        this.inventoryOverlay = null;
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
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                justify-content: center;
                align-items: center;
                pointer-events: auto;
            }
            .phaser-overlay.active {
                display: flex;
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
        } else {
            this.renderInventory();
            overlay.classList.add('active');
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
        itemDiv.addEventListener('touchstart', (event) => {
            event.preventDefault();
            const touch = event.changedTouches[0];
            const pointerEvent = new PointerEvent('pointerdown', {
                pointerId: touch.identifier,
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0
            });
            this.startInventoryDrag(item, pointerEvent);
        }, { passive: false });

            grid.appendChild(itemDiv);
        });
    }

    startInventoryDrag(item, event) {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();

        this.draggedInventoryItem = {
            item,
            pointerId: event.pointerId
        };

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
        this.updateDragPreviewPosition(event.clientX, event.clientY);

        const overlay = this.inventoryOverlay || document.getElementById('inventory-overlay');
        this.inventoryWasOpenOnDrag = !!(overlay && overlay.classList.contains('active'));
        if (this.inventoryWasOpenOnDrag && overlay) {
            overlay.classList.remove('active');
        }

        document.addEventListener('pointermove', this.boundHandleInventoryDragMove, { passive: false });
        document.addEventListener('pointerup', this.boundEndInventoryDrag, { passive: false });
        document.addEventListener('touchmove', this.boundHandleInventoryDragMove, { passive: false });
        document.addEventListener('touchend', this.boundEndInventoryDrag, { passive: false });
    }

    handleInventoryDragMove(event) {
        if (!this.draggedInventoryItem || (event instanceof PointerEvent && event.pointerId !== this.draggedInventoryItem.pointerId)) return;
        event.preventDefault();
        const clientX = event instanceof TouchEvent ? event.changedTouches[0].clientX : event.clientX;
        const clientY = event instanceof TouchEvent ? event.changedTouches[0].clientY : event.clientY;
        this.updateDragPreviewPosition(event.clientX, event.clientY);
    }

    endInventoryDrag(event) {
        const pointerId = event instanceof PointerEvent ? event.pointerId : event.changedTouches?.[0]?.identifier;
        if (!this.draggedInventoryItem || pointerId !== this.draggedInventoryItem.pointerId) return;
        event.preventDefault();

        const { item } = this.draggedInventoryItem;

        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }

        document.removeEventListener('pointermove', this.boundHandleInventoryDragMove);
        document.removeEventListener('pointerup', this.boundEndInventoryDrag);
        document.removeEventListener('touchmove', this.boundHandleInventoryDragMove);
        document.removeEventListener('touchend', this.boundEndInventoryDrag);

        this.draggedInventoryItem = null;

        const overlay = this.inventoryOverlay || document.getElementById('inventory-overlay');
        if (this.inventoryWasOpenOnDrag && overlay) {
            overlay.classList.add('active');
        }
        this.inventoryWasOpenOnDrag = false;

        if (!window.game || !game.canvas) return;
        const rect = game.canvas.getBoundingClientRect();
        const clientX = event instanceof TouchEvent ? event.changedTouches[0].clientX : event.clientX;
        const clientY = event instanceof TouchEvent ? event.changedTouches[0].clientY : event.clientY;
        const inside = clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom;

        if (inside && this.activeScene && typeof this.activeScene.handleInventoryDrop === 'function') {
            const pointerPosition = {
                x: clientX,
                y: clientY
            };
            this.activeScene.handleInventoryDrop(item.id, pointerPosition);
        }
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
            window.location.href = 'index.php';
        }
    }
}

// Instância global
const uiManager = new UIManager();
