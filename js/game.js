// Game Engine
// Vila Abandonada

const API_BASE_URL = 'api/';

// IndexedDB helpers (para carregar dados do editor)
function openGameDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VilaAbandonadaDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('gameData')) {
                db.createObjectStore('gameData');
            }
        };
    });
}

async function loadFromIndexedDB(key) {
    const db = await openGameDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['gameData'], 'readonly');
        const store = transaction.objectStore('gameData');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Game State
let gameState = {
    sessionToken: null,
    username: null,
    currentLocation: 'forest_entrance',
    visitedLocations: ['forest_entrance'],
    collectedItems: [],
    solvedPuzzles: [],
    inventory: {},
    hasKey: false,
    gameCompleted: false
};

// DOM Elements
const gameView = document.getElementById('gameView');
const locationImage = document.getElementById('locationImage');
const locationName = document.getElementById('locationName');
const locationDescription = document.getElementById('locationDescription');
const hotspotsContainer = document.getElementById('hotspots');
const usernameDisplay = document.getElementById('usernameDisplay');
const loadingScreen = document.getElementById('loadingScreen');

// Buttons
const connectionsBtn = document.getElementById('connectionsBtn');
const saveBtn = document.getElementById('saveBtn');
const mapBtn = document.getElementById('mapBtn');
const inventoryBtn = document.getElementById('inventoryBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Overlays
const connectionsOverlay = document.getElementById('connectionsOverlay');
const mapOverlay = document.getElementById('mapOverlay');
const inventoryOverlay = document.getElementById('inventoryOverlay');
const puzzleOverlay = document.getElementById('puzzleOverlay');
const closeConnectionsBtn = document.getElementById('closeConnectionsBtn');
const closeMapBtn = document.getElementById('closeMapBtn');
const closeInventoryBtn = document.getElementById('closeInventoryBtn');
const closePuzzleBtn = document.getElementById('closePuzzleBtn');

// Notification
const itemNotification = document.getElementById('itemNotification');
const notificationText = document.getElementById('notificationText');

// Initialize game
window.addEventListener('DOMContentLoaded', async () => {
    // Check if logged in
    const sessionToken = localStorage.getItem('session_token');
    const username = localStorage.getItem('username');

    if (!sessionToken || !username) {
        window.location.href = 'index.html';
        return;
    }

    gameState.sessionToken = sessionToken;
    gameState.username = username;
    usernameDisplay.textContent = username;

    // Load editor data (if exists)
    try {
        const editorData = await loadFromIndexedDB('gameLocations');
        if (editorData) {
            Object.assign(GAME_MAP, editorData);
            console.log('✅ Dados carregados do editor (IndexedDB)!');
        }
    } catch (e) {
        console.log('ℹ️ Nenhum dado do editor encontrado (usando dados padrão)');
    }

    // Load game progress
    await loadProgress();

    // Render current location
    renderLocation();

    // Hide loading screen
    loadingScreen.style.display = 'none';

    // Setup event listeners
    setupEventListeners();

    // Reajustar container quando browser redimensionar
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(adjustHotspots, 100);
    });

    // Tecla Tab ou H para mostrar todos os hotspots temporariamente
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.key === 'h' || e.key === 'H') {
            e.preventDefault();
            const hotspots = document.querySelectorAll('.hotspot');
            hotspots.forEach(h => {
                h.style.border = '2px dashed rgba(255, 235, 59, 0.7)';
                h.style.background = 'rgba(255, 235, 59, 0.15)';
            });
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'Tab' || e.key === 'h' || e.key === 'H') {
            const hotspots = document.querySelectorAll('.hotspot');
            hotspots.forEach(h => {
                // Só esconder se não estiver com hover
                if (!h.matches(':hover')) {
                    h.style.border = 'none';
                    h.style.background = 'transparent';
                }
            });
        }
    });

    // Auto-save every 30 seconds
    setInterval(() => saveProgress(false), 30000);
});

// Setup event listeners
function setupEventListeners() {
    connectionsBtn.addEventListener('click', openConnections);
    saveBtn.addEventListener('click', () => saveProgress(true));
    mapBtn.addEventListener('click', openMap);
    inventoryBtn.addEventListener('click', openInventory);
    logoutBtn.addEventListener('click', logout);
    closeConnectionsBtn.addEventListener('click', () => connectionsOverlay.style.display = 'none');
    closeMapBtn.addEventListener('click', () => mapOverlay.style.display = 'none');
    closeInventoryBtn.addEventListener('click', () => inventoryOverlay.style.display = 'none');
    closePuzzleBtn.addEventListener('click', () => puzzleOverlay.style.display = 'none');
}

// Load progress from server
async function loadProgress() {
    try {
        const response = await fetch(API_BASE_URL + 'load-progress.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_token: gameState.sessionToken })
        });

        const data = await response.json();

        if (data.success) {
            const progress = data.data;
            gameState.currentLocation = progress.current_location;
            gameState.visitedLocations = progress.visited_locations || ['forest_entrance'];
            gameState.collectedItems = progress.collected_items || [];
            gameState.solvedPuzzles = progress.solved_puzzles || [];
            gameState.inventory = progress.inventory || {};
            gameState.hasKey = progress.has_key || false;
            gameState.gameCompleted = progress.game_completed || false;

            if (gameState.gameCompleted) {
                showVictoryScreen();
            }
        }
    } catch (error) {
        console.error('Failed to load progress:', error);
        showNotification('Erro ao carregar progresso', true);
    }
}

// Save progress to server
async function saveProgress(showMessage = true) {
    try {
        const response = await fetch(API_BASE_URL + 'save-progress.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_token: gameState.sessionToken,
                current_location: gameState.currentLocation,
                visited_locations: gameState.visitedLocations,
                collected_items: gameState.collectedItems,
                solved_puzzles: gameState.solvedPuzzles,
                inventory: gameState.inventory,
                has_key: gameState.hasKey,
                game_completed: gameState.gameCompleted
            })
        });

        const data = await response.json();

        if (data.success && showMessage) {
            showNotification('Progresso salvo!');
        }
    } catch (error) {
        console.error('Failed to save progress:', error);
        if (showMessage) {
            showNotification('Erro ao salvar', true);
        }
    }
}

// Ajusta a posição e o tamanho de todos os hotspots com base no tamanho da imagem
function adjustHotspots() {
    adjustHotspotsContainer(); // Primeiro, ajusta o container

    const imgRect = locationImage.getBoundingClientRect();
    const hotspots = hotspotsContainer.querySelectorAll('.hotspot');

    hotspots.forEach(hotspot => {
        const x = parseFloat(hotspot.dataset.x);
        const y = parseFloat(hotspot.dataset.y);
        const width = parseFloat(hotspot.dataset.width);
        const height = parseFloat(hotspot.dataset.height);

        hotspot.style.left = (x / 100) * imgRect.width + 'px';
        hotspot.style.top = (y / 100) * imgRect.height + 'px';
        hotspot.style.width = (width / 100) * imgRect.width + 'px';
        hotspot.style.height = (height / 100) * imgRect.height + 'px';
    });
}

// Ajustar hotspots container para coincidir com a imagem
function adjustHotspotsContainer() {
    const imgRect = locationImage.getBoundingClientRect();
    const viewRect = gameView.getBoundingClientRect();

    hotspotsContainer.style.width = imgRect.width + 'px';
    hotspotsContainer.style.height = imgRect.height + 'px';
    hotspotsContainer.style.transform = 'none'; // Remover a escala
    hotspotsContainer.style.left = (imgRect.left - viewRect.left) + 'px';
    hotspotsContainer.style.top = (imgRect.top - viewRect.top) + 'px';
}

// Render current location
function renderLocation() {
    const location = getLocation(gameState.currentLocation);

    if (!location) {
        console.error('Location not found:', gameState.currentLocation);
        return;
    }

    // Mark as visited
    if (!gameState.visitedLocations.includes(location.id)) {
        gameState.visitedLocations.push(location.id);
    }

    // Update UI
    locationName.textContent = location.name;
    locationDescription.textContent = location.description;
    locationImage.src = location.image;
    locationImage.alt = location.name;

    const handleImageLoad = () => {
        hotspotsContainer.innerHTML = '';

        location.hotspots.forEach((hotspot, index) => {
            const hotspotEl = createHotspot(hotspot);
            hotspotsContainer.appendChild(hotspotEl);
        });

        if (location.items) {
            location.items.forEach(item => {
                if (!gameState.collectedItems.includes(item.id)) {
                    const itemHotspot = createItemHotspot(item);
                    hotspotsContainer.appendChild(itemHotspot);
                }
            });
        }

        // Atrasar o ajuste se o zoom-in-effect estiver ativo
        if (gameView.classList.contains('zoom-in-effect')) {
            // Esperar um pouco mais que a duração da transição (700ms)
            setTimeout(adjustHotspots, 750);
        } else {
            adjustHotspots();
        }
    };

    if (locationImage.complete) {
        // Garante que o navegador tenha renderizado a imagem antes de ajustar os hotspots
        requestAnimationFrame(handleImageLoad);
    } else {
        locationImage.onload = handleImageLoad;
    }
}

// Create hotspot element
function createHotspot(hotspot) {
    const div = document.createElement('div');
    div.className = 'hotspot';

    // Salvar dados de posição em atributos data-
    div.dataset.x = hotspot.position.x;
    div.dataset.y = hotspot.position.y;
    div.dataset.width = hotspot.position.width;
    div.dataset.height = hotspot.position.height;

    if (hotspot.action === 'navigate') {
        div.classList.add('is-navigation-hotspot');
        const arrow = document.createElement('span');
        arrow.className = 'navigation-hotspot';
        let arrowChar = '➤';
        if (hotspot.arrowDirection) {
            arrow.classList.add('arrow-' + hotspot.arrowDirection);
            switch (hotspot.arrowDirection) {
                case 'left':
                    arrowChar = '◄';
                    break;
                case 'up':
                    arrowChar = '▲';
                    break;
                case 'down':
                    arrowChar = '▼';
                    break;
            }
        }
        arrow.innerHTML = arrowChar;
        div.appendChild(arrow);
    }
    
    div.style.position = 'absolute';
    div.style.zIndex = '150';
    div.style.cursor = 'pointer';
    div.style.pointerEvents = 'auto';
    div.title = hotspot.name;
    div.style.border = 'none';
    div.style.background = 'transparent';
    div.style.transition = 'all 0.3s ease';

    div.addEventListener('click', () => {
        handleHotspotClick(hotspot);
    });

    if (hotspot.action !== 'navigate') {
        // Hover effect - aparecem ao passar o mouse
        div.addEventListener('mouseenter', () => {
            div.style.border = '3px solid rgba(255, 235, 59, 0.9)';
            div.style.background = 'rgba(255, 235, 59, 0.3)';
        });
        div.addEventListener('mouseleave', () => {
            div.style.border = 'none';
            div.style.background = 'transparent';
        });
    }

    // Visual indicator
    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.textContent = hotspot.name;
    div.appendChild(label);

    return div;
}

// Create item hotspot
function createItemHotspot(item) {
    const div = document.createElement('div');

    // Check if item has image path
    if (item.image && item.position) {
        // Render as PNG image with hover effect (usando backgroundImage igual ao editor)
        div.className = 'item-png';
        div.title = item.name;

        // Initialize transform if not set
        if (!item.transform) {
            item.transform = {
                rotation: 0, scaleX: 1, scaleY: 1, flipX: false, flipY: false,
                rotateX: 0, rotateY: 0, skewX: 0, skewY: 0,
                opacity: 1, shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0
            };
        }

        // Build base transform string
        const baseTransforms = [
            'translate(-50%, -50%)',
            `rotateZ(${item.transform.rotation || 0}deg)`,
            `rotateX(${item.transform.rotateX || 0}deg)`,
            `rotateY(${item.transform.rotateY || 0}deg)`,
            `scaleX(${(item.transform.scaleX || 1) * (item.transform.flipX ? -1 : 1)})`,
            `scaleY(${(item.transform.scaleY || 1) * (item.transform.flipY ? -1 : 1)})`,
            `skewX(${item.transform.skewX || 0}deg)`,
            `skewY(${item.transform.skewY || 0}deg)`
        ];

        // Build filter string for shadow
        const shadowBlur = item.transform.shadowBlur || 0;
        const shadowX = item.transform.shadowOffsetX || 0;
        const shadowY = item.transform.shadowOffsetY || 0;
        const filterString = shadowBlur > 0
            ? `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.5))`
            : 'none';

        // CSS IGUAL AO EDITOR - usando backgroundImage
        div.style.cssText = `
            position: absolute;
            left: ${item.position.x}%;
            top: ${item.position.y}%;
            width: ${item.size?.width || 80}px;
            height: ${item.size?.height || 80}px;
            transform: ${baseTransforms.join(' ')};
            cursor: pointer;
            pointer-events: auto;
            z-index: 100;
            background-image: url(${item.image});
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: ${item.transform.opacity || 1};
            filter: ${filterString};
            transition: transform 0.3s ease, filter 0.3s ease;
        `;

        div.dataset.baseTransform = baseTransforms.join(' ');
        div.dataset.baseFilter = filterString;

        // Hover effect - scale on top of existing transforms
        div.addEventListener('mouseenter', () => {
            div.style.transform = div.dataset.baseTransform + ' scale(1.15)';
            const baseF = div.dataset.baseFilter;
            div.style.filter = (baseF !== 'none' ? baseF + ' ' : '') + 'brightness(1.1)';
        });
        div.addEventListener('mouseleave', () => {
            div.style.transform = div.dataset.baseTransform;
            div.style.filter = div.dataset.baseFilter;
        });

    } else {
        // Fallback to hotspot style
        div.className = 'hotspot item-hotspot';

        // Use position if available, otherwise default
        if (item.position) {
            div.style.left = item.position.x + '%';
            div.style.top = item.position.y + '%';
        } else {
            div.style.left = '50%';
            div.style.top = '50%';
        }

        div.style.width = (item.position?.width || 10) + '%';
        div.style.height = (item.position?.height || 10) + '%';
        div.title = item.name;

        const label = document.createElement('div');
        label.className = 'hotspot-label';
        label.textContent = '✨ ' + item.name;
        div.appendChild(label);
    }

    div.addEventListener('click', () => {
        collectItem(item);
    });

    return div;
}

// Handle hotspot click
function handleHotspotClick(hotspot) {
    switch (hotspot.action) {
        case 'navigate':
            navigateToLocation(hotspot.target, hotspot);
            break;
        case 'puzzle':
            openPuzzle(hotspot.target);
            break;
        case 'examine':
            showNotification(hotspot.message || 'Nada de interessante aqui...');
            break;
        case 'collect':
            const location = getLocation(gameState.currentLocation);
            const itemToCollect = location.items?.find(item => item.id === hotspot.itemId);
            if (itemToCollect && !gameState.collectedItems.includes(hotspot.itemId)) {
                collectItem(itemToCollect);
            } else {
                showNotification('Item não encontrado ou já coletado');
            }
            break;
        case 'interact':
            // Generic interaction
            showNotification('Nada de interessante aqui...');
            break;
    }
}

// Navigate to new location
function navigateToLocation(locationId, hotspot) {
    console.log('Navigating to:', locationId, 'from hotspot:', hotspot);
    const location = getLocation(locationId);

    if (!location) {
        showNotification('Local não encontrado', true);
        return;
    }

    // Check if location is unlocked
    if (!location.unlocked && !gameState.visitedLocations.includes(locationId)) {
        const currentLocation = getLocation(gameState.currentLocation);
        if (!currentLocation.connections.includes(locationId)) {
            showNotification('Este local está trancado', true);
            return;
        }
    }

    if (hotspot && hotspot.action === 'navigate') {
        const transformOriginX = hotspot.position.x + (hotspot.position.width / 2);
        const transformOriginY = hotspot.position.y + (hotspot.position.height / 2);
        
        console.log('Calculated transform-origin:', `${transformOriginX}% ${transformOriginY}%`);

        locationImage.style.transformOrigin = `${transformOriginX}% ${transformOriginY}%`;
        gameView.classList.add('zoom-in-effect');
        console.log('Added zoom-in-effect class to gameView');

        setTimeout(() => {
            console.log('Changing location now');
            gameState.currentLocation = locationId;
            renderLocation();
            
            // Remove class and reset transform on the next frame to ensure the new image renders first
            requestAnimationFrame(() => {
                gameView.classList.remove('zoom-in-effect');
                locationImage.style.transformOrigin = 'center center';
                console.log('Removed zoom-in-effect class and reset transform-origin');
            });

            saveProgress(false);
            location.reload(true); // Força um refresh completo da página (sem cache)
        }, 700); // Corresponds to CSS transition duration
    } else {
        gameState.currentLocation = locationId;
        renderLocation();
        saveProgress(false);
        location.reload(true); // Força um refresh completo da página (sem cache)
    }
}

// Collect item
function collectItem(item) {
    gameState.collectedItems.push(item.id);
    gameState.inventory[item.id] = {
        name: item.name,
        description: item.description
    };

    showNotification(`Você pegou: ${item.name}`);
    renderLocation(); // Re-render to hide collected item
    saveProgress(false);
}

// Open puzzle
function openPuzzle(puzzleId) {
    const location = getLocation(gameState.currentLocation);
    const puzzle = location.puzzle;

    if (!puzzle || puzzle.id !== puzzleId) {
        showNotification('Enigma não encontrado', true);
        return;
    }

    // Check if already solved
    if (gameState.solvedPuzzles.includes(puzzleId)) {
        showNotification('Você já resolveu este enigma');
        return;
    }

    renderPuzzle(puzzle);
    puzzleOverlay.style.display = 'flex';
}

// Render puzzle
function renderPuzzle(puzzle) {
    const puzzleTitle = document.getElementById('puzzleTitle');
    const puzzleContainer = document.getElementById('puzzleContainer');

    puzzleTitle.textContent = puzzle.name;
    puzzleContainer.innerHTML = `
        <p class="puzzle-description">${puzzle.description}</p>
        <div id="puzzleInput"></div>
        <button id="submitPuzzle" class="btn btn-primary">Confirmar</button>
        <div id="puzzleMessage" class="form-message"></div>
    `;

    const puzzleInput = document.getElementById('puzzleInput');

    // Helper for sequence puzzles
    function addToSequence(index, symbol) {
        if (!window.puzzleSequence) window.puzzleSequence = [];
        window.puzzleSequence.push(index);
        document.getElementById('currentSequence').textContent = window.puzzleSequence.map(i =>
            ['☀️ Sol', '⭐ Estrela', '🌙 Lua'][i] || i
        ).join(' → ');
    }

    // Render based on puzzle type
    switch (puzzle.type) {
        case 'direction':
        case 'color_sequence':
        case 'riddle':
            puzzle.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'puzzle-option';
                btn.textContent = option;
                btn.dataset.index = index;
                puzzleInput.appendChild(btn);
            });
            break;

        case 'sequence_symbols':
            puzzleInput.innerHTML = '<p>Clique nos símbolos na ordem correta:</p><div id="symbolSequence"></div><button id="clearSequence" class="btn btn-secondary" style="margin-top: 10px;">Limpar</button>';
            const symbolContainer = document.getElementById('symbolSequence');
            const symbolContainer = document.getElementById('symbolSequence');
            puzzle.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'puzzle-option symbol-btn';
                btn.textContent = option;
                btn.dataset.index = index;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToSequence(index, option);
                });
                symbolContainer.appendChild(btn);
            });

            const sequenceDisplay = document.createElement('div');
            sequenceDisplay.id = 'sequenceDisplay';
            sequenceDisplay.style.marginTop = '15px';
            sequenceDisplay.style.padding = '10px';
            sequenceDisplay.style.background = 'rgba(255,255,255,0.05)';
            sequenceDisplay.style.borderRadius = '5px';
            sequenceDisplay.innerHTML = '<strong>Sequência:</strong> <span id="currentSequence">Nenhum</span>';
            puzzleInput.appendChild(sequenceDisplay);

            const clearSequence = document.getElementById('clearSequence');
            clearSequence.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.puzzleSequence = [];
                document.getElementById('currentSequence').textContent = 'Nenhum';
            });

            window.puzzleSequence = [];
            break;

        case 'math':
        case 'code':
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'puzzleAnswer';
            input.placeholder = 'Digite sua resposta';
            puzzleInput.appendChild(input);
            break;

        case 'item_combination':
            puzzleInput.innerHTML = '<p>Você precisa de itens especiais no inventário.</p>';
            puzzle.requiredItems.forEach(itemId => {
                const hasItem = gameState.collectedItems.includes(itemId);
                const itemName = gameState.inventory[itemId]?.name || itemId;
                const status = hasItem ? '✓' : '✗';
                puzzleInput.innerHTML += `<p class="${hasItem ? 'has-item' : 'missing-item'}">${status} ${itemName}</p>`;
            });
            break;

        case 'key_check':
            const hasKey = gameState.hasKey;
            puzzleInput.innerHTML = hasKey
                ? '<p class="has-item">✓ Você tem a Chave Mestra!</p>'
                : '<p class="missing-item">✗ Você precisa da Chave Mestra</p>';
            break;
    }

    const submitPuzzle = document.getElementById('submitPuzzle');
    submitPuzzle.addEventListener('click', () => {
        checkPuzzleAnswer(puzzle);
    });
}

// Check puzzle answer
function checkPuzzleAnswer(puzzle) {
    const puzzleMessage = document.getElementById('puzzleMessage');
    let isCorrect = false;

    switch (puzzle.type) {
        case 'direction':
        case 'riddle':
            const selectedOption = document.querySelector('.puzzle-option.selected');
            if (selectedOption && parseInt(selectedOption.dataset.index) === puzzle.correctAnswer) {
                isCorrect = true;
            }
            break;

        case 'sequence_symbols':
            const userSequence = window.puzzleSequence || [];
            const correctSeq = puzzle.correctSequence;
            if (JSON.stringify(userSequence) === JSON.stringify(correctSeq)) {
                isCorrect = true;
            }
            break;

        case 'math':
        case 'code':
            const answer = document.getElementById('puzzleAnswer').value.trim();
            if (answer == puzzle.answer) {
                isCorrect = true;
            }
            break;

        case 'item_combination':
            isCorrect = puzzle.requiredItems.every(itemId => gameState.collectedItems.includes(itemId));
            break;

        case 'key_check':
            isCorrect = gameState.hasKey;
            break;
    }

    if (isCorrect) {
        gameState.solvedPuzzles.push(puzzle.id);
        puzzleMessage.textContent = 'Correto!';
        puzzleMessage.className = 'form-message success';

        // Give reward
        if (puzzle.reward) {
            if (puzzle.reward.id === 'master_key') {
                gameState.hasKey = true;
            }

            collectItem(puzzle.reward);
        }

        // Special actions
        if (puzzle.onSuccess === 'game_complete') {
            gameState.gameCompleted = true;
            saveProgress(false);
            setTimeout(() => {
                puzzleOverlay.style.display = 'none';
                showVictoryScreen();
            }, 2000);
        } else {
            setTimeout(() => {
                puzzleOverlay.style.display = 'none';
            }, 1500);
        }

        saveProgress(false);
    } else {
        puzzleMessage.textContent = 'Resposta incorreta. Tente novamente.';
        puzzleMessage.className = 'form-message error';
    }
}

// Enable option selection for puzzles
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('puzzle-option')) {
        document.querySelectorAll('.puzzle-option').forEach(opt => opt.classList.remove('selected'));
        e.target.classList.add('selected');
    }
});

// Open map overlay
function openMap() {
    const mapContainer = document.getElementById('mapContainer');
    mapContainer.innerHTML = '';

    // Add visual map image if available
    const visualMapDiv = document.createElement('div');
    visualMapDiv.className = 'visual-map-container';
    visualMapDiv.innerHTML = `
        <div class="map-view-toggle">
            <button id="visualMapBtn" class="btn-map-toggle active">Mapa Visual</button>
            <button id="listMapBtn" class="btn-map-toggle">Lista de Locais</button>
        </div>
        <div id="visualMapArea" class="visual-map-area">
            <img src="images/village_map.jpg" alt="Mapa da Vila" class="village-map-image">
            <div id="mapHotspots" class="map-hotspots"></div>
        </div>
        <div id="listMapArea" class="list-map-area" style="display: none;"></div>
    `;
    mapContainer.appendChild(visualMapDiv);

    // Populate list view
    const listMapArea = document.getElementById('listMapArea');
    const unlockedLocations = getUnlockedLocations(gameState.visitedLocations);

    unlockedLocations.forEach(location => {
        const locationCard = document.createElement('div');
        locationCard.className = 'map-location';
        if (location.id === gameState.currentLocation) {
            locationCard.classList.add('current');
        }

        locationCard.innerHTML = `
            <h3>${location.name}</h3>
            <p>${location.description.substring(0, 60)}...</p>
        `;

        listMapArea.appendChild(locationCard);
    });

    // Toggle buttons
    const visualMapBtn = document.getElementById('visualMapBtn');
    const listMapBtn = document.getElementById('listMapBtn');

    visualMapBtn.addEventListener('click', () => {
        document.getElementById('visualMapArea').style.display = 'block';
        document.getElementById('listMapArea').style.display = 'none';
        visualMapBtn.classList.add('active');
        listMapBtn.classList.remove('active');
    });

    listMapBtn.addEventListener('click', () => {
        document.getElementById('visualMapArea').style.display = 'none';
        document.getElementById('listMapArea').style.display = 'block';
        listMapBtn.classList.add('active');
        visualMapBtn.classList.remove('active');
    });

    // Add visual map hotspots (simplified positioning)
    const mapHotspotsContainer = document.getElementById('mapHotspots');
    const mapPositions = {
        forest_entrance: { x: 5, y: 50 },
        village_gate: { x: 15, y: 50 },
        main_square: { x: 50, y: 50 },
        old_church: { x: 35, y: 30 },
        church_tower: { x: 35, y: 15 },
        cemetery: { x: 25, y: 25 },
        abandoned_house: { x: 65, y: 40 },
        house_second_floor: { x: 65, y: 35 },
        house_attic: { x: 65, y: 30 },
        town_hall: { x: 50, y: 30 },
        mayors_office: { x: 55, y: 25 },
        library: { x: 60, y: 25 },
        old_well: { x: 45, y: 60 },
        abandoned_shop: { x: 55, y: 65 },
        blacksmith: { x: 60, y: 70 }
    };

    unlockedLocations.forEach(location => {
        const pos = mapPositions[location.id];
        if (pos) {
            const marker = document.createElement('div');
            marker.className = 'map-marker';
            if (location.id === gameState.currentLocation) {
                marker.classList.add('current-marker');
            }
            marker.style.left = pos.x + '%';
            marker.style.top = pos.y + '%';
            marker.title = location.name;
            marker.innerHTML = `<span class="marker-label">${location.name}</span>`;

            marker.addEventListener('click', () => {
                navigateToLocation(location.id);
                mapOverlay.style.display = 'none';
            });

            mapHotspotsContainer.appendChild(marker);
        }
    });

    mapOverlay.style.display = 'flex';
}

// Open connections overlay
function openConnections() {
    const connectionsContainer = document.getElementById('connectionsContainer');
    const currentLocation = getLocation(gameState.currentLocation);

    if (!currentLocation) {
        return;
    }

    connectionsContainer.innerHTML = `
        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #f0a500; margin-bottom: 15px;">📍 ${currentLocation.name}</h3>
            <p style="line-height: 1.6;">${currentLocation.description}</p>
        </div>

        <h3 style="color: #f0a500; margin-bottom: 15px;">🔗 Conexões Disponíveis (${currentLocation.connections.length})</h3>
        <div id="connectionsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;"></div>

        <div style="margin-top: 25px; padding: 15px; background: rgba(33, 150, 243, 0.1); border-left: 4px solid #2196F3; border-radius: 5px;">
            <strong style="color: #2196F3;">💡 Dica:</strong>
            <span style="color: #b0b0b0;">Clique em um local acima para viajar diretamente para lá!</span>
        </div>


    `;

    const connectionsGrid = document.getElementById('connectionsGrid');
    currentLocation.connections.forEach(connId => {
        const connLocation = getLocation(connId);
        const isVisited = gameState.visitedLocations.includes(connId);
        const div = document.createElement('div');
        div.style.cssText = `background: rgba(${isVisited ? '76, 175, 80' : '240, 165, 0'}, 0.1); border: 2px solid ${isVisited ? '#4CAF50' : '#f0a500'}; border-radius: 10px; padding: 15px; cursor: pointer;`;
        div.innerHTML = `
            <div style="font-weight: bold; color: ${isVisited ? '#4CAF50' : '#f0a500'}; margin-bottom: 8px;">
                ${isVisited ? '✓' : '→'} ${connLocation.name}
            </div>
            <div style="font-size: 0.9em; color: #b0b0b0;">
                ${connLocation.description.substring(0, 60)}...
            </div>
            <div style="margin-top: 8px; font-size: 0.85em; color: #888;">
                ${isVisited ? 'Já visitado' : 'Não visitado'}
            </div>
        `;
        div.addEventListener('click', () => navigateFromConnections(connId));
        connectionsGrid.appendChild(div);
    });

    const textCenterDiv = document.createElement('div');
    textCenterDiv.style.cssText = `margin-top: 15px; text-align: center;`;
    connectionsContainer.appendChild(textCenterDiv);

    const button = document.createElement('button');
    button.style.cssText = `padding: 12px 24px; background: rgba(240, 165, 0, 0.2); border: 2px solid #f0a500; border-radius: 8px; color: #f0a500; cursor: pointer; font-size: 1em;`;
    button.innerHTML = `🗺️ Ver Mapa Completo de Conexões`;
    button.addEventListener('click', () => window.open('connection-visualizer.html', '_blank'));
    textCenterDiv.appendChild(button);

    connectionsOverlay.style.display = 'flex';
}

// Navigate from connections panel
function navigateFromConnections(locationId) {
    navigateToLocation(locationId);
    connectionsOverlay.style.display = 'none';
}

// Open inventory overlay
function openInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    const inventoryEmpty = document.getElementById('inventoryEmpty');

    inventoryGrid.innerHTML = '';

    if (gameState.collectedItems.length === 0) {
        inventoryEmpty.style.display = 'block';
    } else {
        inventoryEmpty.style.display = 'none';

        gameState.collectedItems.forEach(itemId => {
            const item = gameState.inventory[itemId];
            if (item) {
                const itemCard = document.createElement('div');
                itemCard.className = 'inventory-item';
                itemCard.innerHTML = `
                    <div class="item-name">${item.name}</div>
                    <div class="item-description">${item.description}</div>
                `;
                inventoryGrid.appendChild(itemCard);
            }
        });
    }

    inventoryOverlay.style.display = 'flex';
}

// Show notification
function showNotification(message, isError = false) {
    notificationText.textContent = message;
    itemNotification.className = 'notification ' + (isError ? 'error' : 'success');
    itemNotification.style.display = 'block';

    setTimeout(() => {
        itemNotification.style.display = 'none';
    }, 3000);
}

// Show victory screen
function showVictoryScreen() {
    gameView.innerHTML = `
        <div class="victory-screen">
            <h1>🎉 Parabéns! 🎉</h1>
            <h2>Você escapou da Vila Abandonada!</h2>
            <p>Você encontrou a Chave Mestra e abriu o portão.</p>
            <p>A névoa se dissipa e você finalmente encontra o caminho de volta.</p>
            <button class="btn btn-primary" id="playAgainBtn">Jogar Novamente</button>
            <button class="btn btn-secondary" id="exitBtn">Sair</button>
        </div>
    `;

    document.getElementById('playAgainBtn').addEventListener('click', () => location.reload());
    document.getElementById('exitBtn').addEventListener('click', logout);
}

// Logout
async function logout() {
    if (!confirm('Tem certeza que deseja sair? Seu progresso foi salvo.')) {
        return;
    }

    try {
        await fetch(API_BASE_URL + 'logout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_token: gameState.sessionToken })
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
}
