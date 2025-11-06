/**
 * DatabaseLoader
 * Loads game data from MySQL database via APIs
 * Replaces the static map.js file
 */
class DatabaseLoader {
    constructor() {
        this.gameMap = {};
        this.locations = [];
        this.connections = [];
        this.loaded = false;
    }

    /**
     * Load all game data from database
     * @returns {Promise<Object>} Game map data
     */
    async loadGameData() {
        try {
            console.log('🔄 Loading game data from database...');

            // Strong cache-busting
            const cacheBuster = 'v=' + Date.now() + '&r=' + Math.random();
            const response = await fetch('api/locations/list.php?' + cacheBuster, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            console.log('📡 Response status:', response.status);

            const data = await response.json();
            console.log('📥 Data received:', data);

            if (!data.success) {
                throw new Error(data.message || 'Failed to load game data');
            }

            this.locations = data.data.locations;
            this.connections = data.data.connections;

            // Convert to gameMap format (compatible with existing game code)
            this.gameMap = this.convertToGameMapFormat();

            // Make it globally available as GAME_MAP for backward compatibility
            window.GAME_MAP = this.gameMap;

            this.loaded = true;

            console.log(`✅ Loaded ${this.locations.length} locations from database`);
            console.log('📊 Game Map:', this.gameMap);
            console.log('📊 Total hotspots:', this.locations.reduce((sum, loc) => sum + (loc.hotspots?.length || 0), 0));

            return this.gameMap;

        } catch (error) {
            console.error('❌ Error loading game data:', error);

            // Fallback to map.js if database fails
            console.warn('⚠️ Falling back to map.js...');
            return this.loadFallback();
        }
    }

    /**
     * Convert database format to gameMap format
     * @returns {Object} Game map object
     */
    convertToGameMapFormat() {
        const gameMap = {};

        for (const location of this.locations) {
            // Separar hotspots entre navegação e items
            const hotspots = [];
            const items = [];

            if (location.puzzle && location.puzzle.visual) {
                location.puzzle.visual = this.normalizePuzzleVisual(location.puzzle.visual);
            }

            (location.hotspots || []).forEach(h => {
                if (h.type === 'item' && h.item_id) {
                    // Este é um item colecionável
                    items.push({
                        id: h.item_id,
                        name: h.label || h.item_id,
                        description: h.description || '',
                        image: h.item_image || '',  // ✅ Imagem do JOIN
                        position: {
                            x: parseFloat(h.x),
                            y: parseFloat(h.y)
                        },
                        size: {
                            width: parseFloat(h.width),
                            height: parseFloat(h.height)
                        },
                        transform: {
                            rotation: parseFloat(h.rotation) || 0,
                            rotateX: parseFloat(h.rotate_x) || 0,
                            rotateY: parseFloat(h.rotate_y) || 0,
                            scaleX: parseFloat(h.scale_x) || 1,
                            scaleY: parseFloat(h.scale_y) || 1,
                            skewX: parseFloat(h.skew_x) || 0,
                            skewY: parseFloat(h.skew_y) || 0,
                            flipX: h.flip_x === 1 || h.flip_x === '1' || h.flip_x === true,
                            flipY: h.flip_y === 1 || h.flip_y === '1' || h.flip_y === true,
                            opacity: parseFloat(h.opacity) ?? 1,
                            shadowBlur: parseFloat(h.shadow_blur) || 0,
                            shadowOffsetX: parseFloat(h.shadow_offset_x) || 0,
                            shadowOffsetY: parseFloat(h.shadow_offset_y) || 0
                        }
                    });
                } else {
                    // Este é um hotspot de navegação/interação
                    hotspots.push(h);
                }
            });

            gameMap[location.id] = {
                id: location.id,
                name: location.name,
                description: location.description,
                image: location.background_image,
                hotspots: this.convertHotspots(hotspots),  // Só hotspots de navegação
                items: items  // Items separados
            };

            if (location.puzzle) {
                gameMap[location.id].puzzle = location.puzzle;
            }
        }

        return gameMap;
    }

    normalizePuzzleVisual(visual) {
        const normalized = { ...visual };
        if (typeof normalized.beforeImage === 'undefined') normalized.beforeImage = '';
        if (typeof normalized.afterImage === 'undefined') normalized.afterImage = '';
        if (!normalized.position) normalized.position = { x: 50, y: 50 };
        if (!normalized.size) normalized.size = { width: 120, height: 120 };
        if (!normalized.transform) {
            normalized.transform = {
                rotation: 0,
                rotateX: 0,
                rotateY: 0,
                scaleX: 1,
                scaleY: 1,
                skewX: 0,
                skewY: 0,
                flipX: false,
                flipY: false,
                opacity: 1,
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0
            };
        }
        return normalized;
    }

    /**
     * Convert database hotspots to game format
     * @param {Array} dbHotspots Database hotspots
     * @returns {Array} Game hotspots
     */
    convertHotspots(dbHotspots) {
        if (!dbHotspots) return [];

        console.log(`🔍 Convertendo ${dbHotspots.length} hotspots do banco...`);

        return dbHotspots.map(h => {
            const hotspot = {
                id: h.id,
                label: h.label,
                action: h.type, // Map 'type' to 'action'
                position: {
                    x: parseFloat(h.x),
                    y: parseFloat(h.y),
                    width: parseFloat(h.width),
                    height: parseFloat(h.height)
                },
                zoomDirection: h.zoom_direction
            };

            // Add type-specific properties
            // Banco usa 'navigation', editor usa 'navigate'
            if ((h.type === 'navigate' || h.type === 'navigation') && h.target_location) {
                hotspot.targetLocation = h.target_location; // LocationScene espera targetLocation
            } else if (h.type === 'item' && h.item_id) {
                hotspot.itemId = h.item_id;
            } else if (h.type === 'puzzle' && h.puzzle_id) {
                hotspot.puzzleId = h.puzzle_id;
            }

            console.log(`  ✅ Hotspot: "${hotspot.label}" at (${hotspot.position.x}, ${hotspot.position.y}) → targetLocation: ${hotspot.targetLocation}`);

            return hotspot;
        });
    }

    /**
     * Fallback to map.js if database fails
     * @returns {Object} Game map from map.js
     */
    loadFallback() {
        if (typeof gameMap !== 'undefined') {
            console.log('✓ Using fallback map.js');
            this.gameMap = gameMap;
            this.loaded = true;
            return gameMap;
        } else {
            console.error('❌ No fallback available! map.js not found.');
            return {};
        }
    }

    /**
     * Get a specific location
     * @param {string} locationId Location ID
     * @returns {Object|null} Location data
     */
    getLocation(locationId) {
        return this.gameMap[locationId] || null;
    }

    /**
     * Check if game data is loaded
     * @returns {boolean}
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * Get all location IDs
     * @returns {Array<string>}
     */
    getLocationIds() {
        return Object.keys(this.gameMap);
    }

    /**
     * Get connections for a location
     * @param {string} locationId
     * @returns {Array<string>}
     */
    getConnections(locationId) {
        return this.connections
            .filter(c => c.from_location === locationId)
            .map(c => c.to_location);
    }
}

// Create global instance
const databaseLoader = new DatabaseLoader();
