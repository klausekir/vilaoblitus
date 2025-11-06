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

        this.state.collectedItems.push(item.id);
        this.state.inventory[item.id] = {
            name: item.name,
            description: item.description,
            image: item.image,
            size: item.size || { width: 80, height: 80 },
            status: 'held'
        };

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
    solvePuzzle(puzzleId, reward) {
        if (this.state.solvedPuzzles.includes(puzzleId)) {
            return false; // Já resolvido
        }

        this.state.solvedPuzzles.push(puzzleId);

        if (reward) {
            this.collectItem(reward);
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
        return this.state.inventory[itemId] || null;
    }

    /**
     * Lista os itens que estão com o jogador
     */
    getInventoryArray() {
        return Object.entries(this.state.inventory)
            .filter(([, item]) => (item.status || 'held') === 'held')
            .map(([id, item]) => ({ id, ...item }));
    }

    /**
     * Lista itens posicionados no cenário atual
     */
    getDroppedItems(locationId) {
        return Object.entries(this.state.inventory)
            .filter(([, item]) => item.status === 'dropped' && item.dropLocation === locationId)
            .map(([id, item]) => ({ id, ...item }));
    }

    isItemAvailable(itemId) {
        const item = this.state.inventory[itemId];
        if (!item) return false;
        return item.status !== 'used';
    }

    isItemPlacedAtLocation(itemId, locationId, requirePuzzleArea = false) {
        const item = this.state.inventory[itemId];
        if (!item || item.status !== 'dropped') return false;
        if (item.dropLocation !== locationId) return false;
        if (requirePuzzleArea) {
            return !!item.dropInPuzzleArea;
        }
        return true;
    }

    dropInventoryItem(itemId, locationId, positionPercent, options = {}) {
        const item = this.state.inventory[itemId];
        if (!item || item.status === 'used') {
            return null;
        }

        item.status = 'dropped';
        item.dropLocation = locationId;
        item.dropPosition = positionPercent;
        item.dropSize = options.size || item.size || { width: 80, height: 80 };
        item.dropInPuzzleArea = !!options.inPuzzleArea;

        this.saveProgress(false);
        this.trigger('inventoryChanged');
        return { id: itemId, ...item };
    }

    pickupDroppedItem(itemId) {
        const item = this.state.inventory[itemId];
        if (!item || item.status !== 'dropped') {
            return null;
        }

        item.status = 'held';
        delete item.dropLocation;
        delete item.dropPosition;
        delete item.dropSize;
        delete item.dropInPuzzleArea;

        this.saveProgress(false);
        this.trigger('inventoryChanged');
        return { id: itemId, ...item };
    }

    consumeItem(itemId) {
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

            const data = await response.json();
            if (data.success) {
                console.log('✓ Progresso salvo no servidor');
            }
        } catch (e) {
            console.warn('Não foi possível salvar no servidor, usando apenas localStorage:', e.message);
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
                return {
                    currentLocation: data.data.current_location,
                    visitedLocations: data.data.visited_locations || [],
                    collectedItems: data.data.collected_items || [],
                    solvedPuzzles: data.data.solved_puzzles || [],
                    inventory: data.data.inventory || {},
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
        if (!this.state.inventory) {
            this.state.inventory = {};
            return;
        }
        Object.values(this.state.inventory).forEach(item => {
            if (!item.size) {
                item.size = { width: 80, height: 80 };
            }
            if (!item.status) {
                item.status = 'held';
            }
        });
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
