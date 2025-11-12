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
            gameCompleted: false
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
            status: 'held'
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
     * Puzzle foi resolvido?
     */
    isPuzzleSolved(puzzleId) {
        return this.state.solvedPuzzles.includes(puzzleId);
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
            const sessionToken = localStorage.getItem('session_token');
            if (sessionToken) {
                await this.saveToServer();
            }

            if (showMessage) {
                console.log('✓ Progresso salvo');
            }
        } catch (e) {
            console.error('Erro ao salvar progresso:', e);
        }
    }

    /**
     * Salvar no servidor
     */
    async saveToServer() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            if (!sessionToken) return;

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
                    game_completed: this.state.gameCompleted
                })
            });

            if (response.status === 401) {
                console.warn('⚠️ Sessão expirada. Progresso salvo apenas localmente.');
                return;
            }

            const data = await response.json();
            if (data.success) {
                console.log('✓ Progresso salvo no servidor');
            } else {
                console.warn('⚠️ Erro ao salvar no servidor:', data.message);
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível salvar no servidor. Progresso salvo localmente:', e.message);
        }
    }

    /**
     * Carregar progresso (servidor tem prioridade)
     */
    async loadProgress() {
        try {
            // Tentar carregar do servidor primeiro
            const sessionToken = localStorage.getItem('session_token');
            if (sessionToken) {
                const serverData = await this.loadFromServer();
                if (serverData) {
                    this.state = serverData;
                    this.normalizeInventory();
                    console.log('✓ Progresso carregado do servidor');
                    // Sincronizar com localStorage
                    localStorage.setItem('vila_abandonada_phaser', JSON.stringify(this.state));
                    return true;
                }
            }

            // Fallback: carregar do localStorage
            const saved = localStorage.getItem('vila_abandonada_phaser');
            if (saved) {
                this.state = JSON.parse(saved);
                this.normalizeInventory();
                localStorage.setItem('vila_abandonada_phaser', JSON.stringify(this.state));
                console.log('✓ Progresso carregado do localStorage');
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
                    visitedLocations: data.data.visited_locations || [],
                    collectedItems: data.data.collected_items || [],
                    solvedPuzzles: data.data.solved_puzzles || [],
                    inventory,
                    hasKey: data.data.has_key || false,
                    gameCompleted: data.data.game_completed || false
                };
            }
        } catch (e) {
            console.warn('Não foi possível carregar do servidor:', e.message);
        }
        return null;
    }

    /**
     * Resetar jogo
     */
    reset() {
        this.state = {
            currentLocation: 'floresta',
            visitedLocations: ['floresta'],
            collectedItems: [],
            solvedPuzzles: [],
            inventory: {},
            hasKey: false,
            gameCompleted: false
        };
        this.normalizeInventory();
        this.saveProgress();
        this.trigger('gameReset');
        this.trigger('inventoryChanged');
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
