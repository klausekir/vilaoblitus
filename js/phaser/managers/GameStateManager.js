/**
 * GameStateManager
 * Gerencia o estado global do jogo (inventário, progresso, save/load)
 */
class GameStateManager {
    constructor() {
        this.state = {
            currentLocation: 'floresta',
            visitedLocations: ['floresta'],
            collectedItems: [],
            solvedPuzzles: [],
            inventory: {},
            hasKey: false,
            gameCompleted: false,
            photographAlbum: [], // Sistema de câmera/fotografias (antigo)
            photos: [], // Sistema de screenshots (novo)
            destroyedWalls: [] // Paredes destruídas
        };

        this.callbacks = {};
        this.normalizeInventory();
    }

    /**
     * Inicializar e carregar progresso salvo
     */
    async init() {
        await this.loadProgress();
    }

    /**
     * Obter estado atual
     */
    getState() {
        return this.state;
    }

    /**
     * Navegar para novo local
     */
    navigateToLocation(locationId) {
        this.state.currentLocation = locationId;

        if (!this.state.visitedLocations.includes(locationId)) {
            this.state.visitedLocations.push(locationId);
        }

        this.saveProgress();
        this.trigger('locationChanged', locationId);
    }

    /**
     * Coletar item
     */
    collectItem(item) {
        if (this.state.collectedItems.includes(item.id)) {
            return false; // Já coletado
        }

        this.normalizeInventory();

        this.state.collectedItems.push(item.id);
        const entryData = {
            name: item.name,
            description: item.description,
            image: item.image,
            size: item.size || { width: 80, height: 80 },
            status: 'held',
            isDisplayItem: item.isDisplayItem || false,
            displayImage: item.displayImage || null
        };

        if (item.transform && typeof item.transform === 'object') {
            entryData.transform = JSON.parse(JSON.stringify(item.transform));
            entryData.renderMode = item.renderMode || 'dom';
        }

        if (item.textureKey) {
            entryData.textureKey = item.textureKey;
        }

        if (item.renderMode && !entryData.renderMode) {
            entryData.renderMode = item.renderMode;
        }

        this.state.inventory[item.id] = this.normalizeInventoryEntry(item.id, entryData);

        if (item.id === 'master_key') {
            this.state.hasKey = true;
        }

        this.saveProgress();
        this.trigger('itemCollected', item);
        this.trigger('inventoryChanged');
        return true;
    }

    /**
     * Item foi coletado?
     */
    isItemCollected(itemId) {
        return this.state.collectedItems.includes(itemId);
    }

    /**
     * Puzzle foi resolvido?
     */
    isPuzzleSolved(puzzleId) {
        return this.state.solvedPuzzles.includes(puzzleId);
    }

    /**
     * Resolver puzzle
     */
    solvePuzzle(puzzleId, reward, locationId = null, rewardOptions = {}) {
        if (this.state.solvedPuzzles.includes(puzzleId)) {
            return false; // Já resolvido
        }

        this.state.solvedPuzzles.push(puzzleId);

        if (reward) {
            this.normalizeInventory();

            const dropPosition = rewardOptions.dropPosition || reward.dropPosition || reward.position || null;
            const dropLocation = rewardOptions.dropLocation || locationId || this.state.currentLocation;
            const dropSize = rewardOptions.dropSize || reward.dropSize || reward.size || null;
            const dropTransform = rewardOptions.dropTransform || reward.dropTransform || reward.transform || null;
            const renderMode = rewardOptions.renderMode || reward.renderMode || undefined;
            const baseTransform = rewardOptions.baseTransform || reward.transform || null;
            const existing = this.state.inventory[reward.id];

            const entryData = {
                ...reward,
                status: 'dropped',
                dropLocation,
                dropPosition,
                dropSize,
                dropTransform,
                renderMode,
                transform: baseTransform || reward.transform || existing?.transform || null
            };

            if (existing) {
                const merged = {
                    ...existing,
                    ...entryData,
                    status: 'dropped'
                };
                if (dropPosition) {
                    merged.dropPosition = dropPosition;
                }
                if (dropSize) {
                    merged.dropSize = dropSize;
                }
                if (dropTransform) {
                    merged.dropTransform = dropTransform;
                }
                if (baseTransform) {
                    merged.transform = baseTransform;
                }
                if (renderMode) {
                    merged.renderMode = renderMode;
                }
                this.state.inventory[reward.id] = this.normalizeInventoryEntry(reward.id, merged);
            } else {
                if (!entryData.size) {
                    entryData.size = dropSize || { width: 80, height: 80 };
                }
                this.state.inventory[reward.id] = this.normalizeInventoryEntry(reward.id, entryData);
            }

            // Recompensas ainda não contam como coletadas até o jogador pegar manualmente
            this.state.collectedItems = this.state.collectedItems.filter(id => id !== reward.id);
        }

        this.saveProgress();
        this.trigger('puzzleSolved', puzzleId);
        this.trigger('inventoryChanged');
        return true;
    }

    /**
     * Verificar se uma parede foi destruída
     */
    isWallDestroyed(locationId, wallId) {
        if (!this.state.destroyedWalls) {
            this.state.destroyedWalls = [];
        }
        return this.state.destroyedWalls.some(w => w.locationId === locationId && w.wallId === wallId);
    }

    /**
     * Destruir uma parede
     */
    destroyWall(locationId, wallId) {
        if (!this.state.destroyedWalls) {
            this.state.destroyedWalls = [];
        }
        if (!this.isWallDestroyed(locationId, wallId)) {
            this.state.destroyedWalls.push({ locationId, wallId });
            this.saveProgress();
        }
    }

    /**
     * Tirar fotografia de uma pista
     */
    takePhotograph(locationId, objectId, imageUrl, caption, clueData = null) {
        // Garantir que photographAlbum existe
        if (!this.state.photographAlbum) {
            this.state.photographAlbum = [];
        }

        // Verificar se já fotografou este objeto
        const existingPhoto = this.state.photographAlbum.find(
            p => p.location === locationId && p.object === objectId
        );

        if (existingPhoto) {
            return { success: false, message: 'Você já fotografou isto.' };
        }

        const photo = {
            id: `photo_${Date.now()}`,
            location: locationId,
            object: objectId,
            image: imageUrl,
            caption: caption,
            clueData: clueData, // Dados adicionais da pista (símbolos, códigos, etc)
            timestamp: Date.now()
        };

        this.state.photographAlbum.push(photo);
        this.saveProgress();
        this.trigger('photographTaken', photo);

        return { success: true, photo: photo };
    }

    /**
     * Obter todas as fotografias
     */
    getPhotographs() {
        if (!this.state.photographAlbum) {
            this.state.photographAlbum = [];
        }
        return this.state.photographAlbum;
    }

    /**
     * Obter fotografias de uma localização específica
     */
    getPhotographsByLocation(locationId) {
        if (!this.state.photographAlbum) {
            this.state.photographAlbum = [];
        }
        return this.state.photographAlbum.filter(p => p.location === locationId);
    }

    /**
     * Verificar se já fotografou um objeto
     */
    hasPhotograph(locationId, objectId) {
        if (!this.state.photographAlbum) {
            this.state.photographAlbum = [];
        }
        return this.state.photographAlbum.some(
            p => p.location === locationId && p.object === objectId
        );
    }

    /**
     * Remover fotografia
     */
    removePhotograph(photoId) {
        if (!this.state.photographAlbum) {
            this.state.photographAlbum = [];
        }
        const index = this.state.photographAlbum.findIndex(p => p.id === photoId);
        if (index >= 0) {
            this.state.photographAlbum.splice(index, 1);
            this.saveProgress();
            this.trigger('photographRemoved', photoId);
            return true;
        }
        return false;
    }

    /**
     * NOVO: Tirar foto da tela (screenshot)
     */
    takePhoto() {
        const game = window.game;
        if (!game || !game.renderer) {
            console.error('[CAMERA] Game não está inicializado');
            return;
        }

        const scene = game.scene.getScene('LocationScene');
        if (!scene) {
            console.error('[CAMERA] LocationScene não encontrada');
            return;
        }

        // Play flash effect
        this.showFlashEffect(scene);

        // Play camera sound
        this.playCameraSound(scene);

        // Animate camera button
        this.animateCameraButton();

        // Capture screenshot
        game.renderer.snapshot((image) => {
            const photoData = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                location: this.state.currentLocation,
                imageData: image.src // base64 string
            };

            if (!this.state.photos) {
                this.state.photos = [];
            }

            // FIFO queue: Limit to 10 photos
            if (this.state.photos.length >= 10) {
                this.state.photos.shift(); // Remove oldest (first) photo
            }

            this.state.photos.push(photoData);

            // Save to localStorage
            this.saveProgress();

            console.log('[CAMERA] Foto capturada!', photoData.location);
        });
    }

    /**
     * Efeito de flash branco na tela
     */
    showFlashEffect(scene) {
        if (!scene || !scene.add || !scene.cameras) return;

        const flash = scene.add.rectangle(
            scene.cameras.main.centerX,
            scene.cameras.main.centerY,
            scene.cameras.main.width,
            scene.cameras.main.height,
            0xffffff
        );
        flash.setAlpha(0);
        flash.setDepth(10000);

        scene.tweens.add({
            targets: flash,
            alpha: { from: 0, to: 0.8 },
            duration: 100,
            yoyo: true,
            onComplete: () => flash.destroy()
        });
    }

    /**
     * Som de câmera
     */
    playCameraSound(scene) {
        if (!scene || !scene.sound) return;

        // Tentar tocar som se existir
        if (scene.sound.get('camera-click')) {
            scene.sound.play('camera-click');
        }
        // Caso contrário, silencioso (ou adicionar beep depois)
    }

    /**
     * Animação do botão de câmera
     */
    animateCameraButton() {
        const btn = document.getElementById('btn-camera');
        if (!btn) return;

        btn.style.transform = 'scale(1.3)';
        btn.style.transition = 'transform 0.2s';

        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 200);
    }

    /**
     * Obter todas as fotos (novo sistema)
     */
    getPhotos() {
        if (!this.state.photos) {
            this.state.photos = [];
        }
        return this.state.photos;
    }

    /**
     * Deletar uma foto
     */
    deletePhoto(photoId) {
        if (!this.state.photos) {
            this.state.photos = [];
            return false;
        }

        const index = this.state.photos.findIndex(p => p.id === photoId);
        if (index >= 0) {
            this.state.photos.splice(index, 1);
            this.saveProgress();
            console.log('[CAMERA] Foto deletada:', photoId);
            return true;
        }

        return false;
    }

    /**
     * Obter dados crus de um item no inventário
     */
    getInventoryItem(itemId) {
        this.normalizeInventory();
        return this.state.inventory[itemId] || null;
    }

    /**
     * Lista os itens que estão com o jogador
     */
    getInventoryArray() {
        this.normalizeInventory();
        return Object.entries(this.state.inventory)
            .filter(([, item]) => (item.status || 'held') === 'held')
            .map(([id, item]) => ({ id, ...item }));
    }

    /**
     * Lista itens posicionados no cenário atual
     */
    getDroppedItems(locationId) {
        this.normalizeInventory();
        return Object.entries(this.state.inventory)
            .filter(([, item]) => item.status === 'dropped' && item.dropLocation === locationId)
            .map(([id, item]) => ({ id, ...item }));
    }

    isItemAvailable(itemId) {
        this.normalizeInventory();
        const item = this.state.inventory[itemId];
        if (!item) return false;
        return item.status !== 'used';
    }

    isItemPlacedAtLocation(itemId, locationId, requirePuzzleArea = false) {
        this.normalizeInventory();
        const item = this.state.inventory[itemId];
        if (!item || item.status !== 'dropped') return false;
        if (item.dropLocation !== locationId) return false;
        if (requirePuzzleArea) {
            return !!item.dropInPuzzleArea;
        }
        return true;
    }

    dropInventoryItem(itemId, locationId, positionPercent, options = {}) {
        this.normalizeInventory();

        const item = this.state.inventory[itemId];
        if (!item || item.status === 'used') {
            console.warn('[Inventory] Item indisponível para drop:', itemId);
            return null;
        }

        item.status = 'dropped';
        item.dropLocation = locationId;
        item.dropPosition = {
            x: Math.max(0, Math.min(100, Number(positionPercent.x) || 0)),
            y: Math.max(0, Math.min(100, Number(positionPercent.y) || 0))
        };
        const baseSize = options.size || item.size || { width: 80, height: 80 };
        item.dropSize = {
            width: Number(baseSize.width) || item.size.width || 80,
            height: Number(baseSize.height) || item.size.height || 80
        };
        item.dropInPuzzleArea = !!options.inPuzzleArea;

        this.saveProgress(false);
        this.trigger('inventoryChanged');
        return { id: itemId, ...item };
    }

    moveDroppedItem(itemId, locationId, positionPercent, options = {}) {
        this.normalizeInventory();

        const item = this.state.inventory[itemId];
        if (!item || item.status !== 'dropped') {
            console.warn('[Inventory] Item indisponível para mover:', itemId);
            return null;
        }

        if (item.dropLocation && item.dropLocation !== locationId) {
            console.warn('[Inventory] O item não está localizado aqui:', itemId, '->', item.dropLocation, '!=', locationId);
        }

        item.dropLocation = locationId;
        item.dropPosition = {
            x: Math.max(0, Math.min(100, Number(positionPercent.x) || 0)),
            y: Math.max(0, Math.min(100, Number(positionPercent.y) || 0))
        };

        if (options.size) {
            const baseSize = options.size || item.dropSize || item.size || { width: 80, height: 80 };
            item.dropSize = {
                width: Number(baseSize.width) || 80,
                height: Number(baseSize.height) || 80
            };
        }

        if (options.inPuzzleArea !== undefined) {
            item.dropInPuzzleArea = !!options.inPuzzleArea;
        }

        this.saveProgress(false);
        this.trigger('inventoryChanged');
        return { id: itemId, ...item };
    }

    pickupDroppedItem(itemId) {
        this.normalizeInventory();
        const item = this.state.inventory[itemId];
        if (!item || item.status !== 'dropped') {
            return null;
        }

        item.status = 'held';
        delete item.dropLocation;
        delete item.dropPosition;
        delete item.dropSize;
        delete item.dropInPuzzleArea;
        if (!this.state.collectedItems.includes(itemId)) {
            this.state.collectedItems.push(itemId);
        }

        this.saveProgress(false);
        this.trigger('inventoryChanged');
        return { id: itemId, ...item };
    }

    consumeItem(itemId) {
        this.normalizeInventory();
        const item = this.state.inventory[itemId];
        if (!item) return;

        item.status = 'used';
        delete item.dropLocation;
        delete item.dropPosition;
        delete item.dropSize;
        delete item.dropInPuzzleArea;

        this.saveProgress(false);
        this.trigger('inventoryChanged');
    }

    /**
     * Salvar progresso (servidor + localStorage)
     */
    async saveProgress(showMessage = true) {
        try {
            // Salvar localmente primeiro (fallback)
            localStorage.setItem('vila_abandonada_phaser', JSON.stringify(this.state));

            // Salvar no servidor se estiver logado
            let serverSaved = false;
            const sessionToken = localStorage.getItem('session_token');
            if (sessionToken) {
                serverSaved = await this.saveToServer();
            }

            if (showMessage) {
            }
            return serverSaved;
        } catch (e) {
            console.error('Erro ao salvar progresso:', e);
            return false;
        }
    }

    /**
     * Salvar no servidor
     */
    async saveToServer() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            if (!sessionToken) {
                console.warn('[SAVE_DEBUG] No session token found');
                return false;
            }

            const response = await fetch('api/save-progress.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_token: sessionToken,
                    current_location: this.state.currentLocation,
                    visited_locations: this.state.visitedLocations,
                    collected_items: this.state.collectedItems,
                    solved_puzzles: this.state.solvedPuzzles,
                    inventory: this.state.inventory,
                    has_key: this.state.hasKey,
                    game_completed: this.state.gameCompleted,
                    photograph_album: this.state.photographAlbum,
                    destroyed_walls: this.state.destroyedWalls
                })
            });

            const data = await response.json();

            if (data.success) {
                return true;
            } else {
                console.warn('⚠️ Erro ao salvar no servidor:', data.message);
                return false;
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível salvar no servidor. Progresso salvo localmente:', e.message);
            return false;
        }
    }

    /**
     * Carregar progresso (servidor tem prioridade)
     */
    async loadProgress() {
        try {
            // Tentar carregar do servidor primeiro

            // Fallback: carregar do localStorage
            const saved = localStorage.getItem('vila_abandonada_phaser');
            if (saved) {
                this.state = JSON.parse(saved);
                this.normalizeInventory();
                localStorage.setItem('vila_abandonada_phaser', JSON.stringify(this.state));
                return true;
            }
        } catch (e) {
            console.error('Erro ao carregar progresso:', e);
        }
        return false;
    }

    /**
     * Carregar do servidor
     */
    async loadFromServer() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            if (!sessionToken) return null;

            const response = await fetch('api/load-progress.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_token: sessionToken })
            });

            const data = await response.json();
            if (data.success && data.data) {
                const inventory = this.mapInventory(data.data.inventory || {});
                return {
                    currentLocation: data.data.current_location,
                    visitedLocations: data.data.visited_locations || ['floresta'],
                    collectedItems: data.data.collected_items || [],
                    solvedPuzzles: data.data.solved_puzzles || [],
                    inventory: inventory,
                    hasKey: !!data.data.has_key,
                    gameCompleted: !!data.data.game_completed,
                    photographAlbum: data.data.photograph_album || [],
                    destroyedWalls: data.data.destroyed_walls || []
                };
            }
            return null;
        } catch (e) {
            console.error('Erro ao carregar do servidor:', e);
            return null;
        }
    }

    /**
     * Resetar jogo
     */
    async reset() {
        this.state = {
            currentLocation: 'floresta',
            visitedLocations: ['floresta'],
            collectedItems: [],
            solvedPuzzles: [],
            inventory: {},
            hasKey: false,
            gameCompleted: false,
            photographAlbum: [],
            destroyedWalls: []
        };
        this.normalizeInventory();
        const success = await this.saveProgress();
        this.trigger('gameReset');
        this.trigger('inventoryChanged');
        return success;
    }

    normalizeInventory() {
        this.state.inventory = this.mapInventory(this.state.inventory);
    }

    mapInventory(rawInventory) {
        const normalized = {};

        if (Array.isArray(rawInventory)) {
            rawInventory.forEach(entry => {
                if (!entry) return;
                if (typeof entry === 'string') {
                    const normalizedEntry = this.normalizeInventoryEntry(entry, { name: entry });
                    if (normalizedEntry) {
                        normalized[entry] = normalizedEntry;
                    }
                    return;
                }
                const id = entry.id || entry.itemId || entry.name;
                if (!id) return;
                const normalizedEntry = this.normalizeInventoryEntry(id, entry);
                if (normalizedEntry) {
                    normalized[id] = normalizedEntry;
                }
            });
        } else if (rawInventory && typeof rawInventory === 'object') {
            Object.entries(rawInventory).forEach(([id, value]) => {
                if (!value) return;
                if (typeof value === 'string') {
                    const normalizedEntry = this.normalizeInventoryEntry(id, { name: value || id });
                    if (normalizedEntry) {
                        normalized[id] = normalizedEntry;
                    }
                    return;
                }
                const normalizedEntry = this.normalizeInventoryEntry(id, { id, ...value });
                if (normalizedEntry) {
                    normalized[id] = normalizedEntry;
                }
            });
        }

        return normalized;
    }

    normalizeInventoryEntry(itemId, raw = {}) {
        if (!itemId) return null;

        const entry = { ...raw };

        if (entry.transform && typeof entry.transform === 'object') {
            try {
                entry.transform = JSON.parse(JSON.stringify(entry.transform));
            } catch (_) {
                entry.transform = { ...entry.transform };
            }
        }

        if (entry.dropTransform && typeof entry.dropTransform === 'object') {
            try {
                entry.dropTransform = JSON.parse(JSON.stringify(entry.dropTransform));
            } catch (_) {
                entry.dropTransform = { ...entry.dropTransform };
            }
        }

        entry.id = itemId;
        entry.name = entry.name || itemId;
        entry.description = entry.description || '';
        entry.image = entry.image || '';

        const size = entry.size && typeof entry.size === 'object' ? entry.size : {};
        entry.size = {
            width: Number(size.width) || 80,
            height: Number(size.height) || 80
        };

        entry.status = entry.status || 'held';

        if (entry.dropPosition && typeof entry.dropPosition === 'object') {
            entry.dropPosition = {
                x: Number(entry.dropPosition.x) || 0,
                y: Number(entry.dropPosition.y) || 0
            };
        }

        if (entry.dropSize && typeof entry.dropSize === 'object') {
            entry.dropSize = {
                width: Number(entry.dropSize.width) || entry.size.width,
                height: Number(entry.dropSize.height) || entry.size.height
            };
        }

        entry.dropLocation = entry.dropLocation || undefined;
        entry.dropInPuzzleArea = !!entry.dropInPuzzleArea;

        return entry;
    }

    /**
     * Sistema de eventos
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

}

// Instância global
const gameStateManager = new GameStateManager();
