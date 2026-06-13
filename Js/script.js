// ==================== SOLITARIO 2048 ====================

// --- CONFIGURACIÓN DEL JUEGO ---
const MAX_CARDS_PER_COLUMN = 8;
const TARGET_VALUE = 2048;
const CARD_IMAGES = {
    2: 'cartas/carta1.png',
    4: 'cartas/carta2.png',
    8: 'cartas/carta3.png',
    16: 'cartas/carta4.png',
    32: 'cartas/carta5.png',
    64: 'cartas/carta6.png',
    128: 'cartas/carta7.png',
    256: 'cartas/carta8.png',
    512: 'cartas/carta9.png',
    1024: 'cartas/carta10.png',
    2048: 'cartas/carta11.png'
};

// --- ESTADO DEL JUEGO ---
let columns = [[], [], [], []];
let cardQueue = []; // Almacena las 3 cartas en cola (Mazo)
let score = 0;
let gameActive = true;
let discardUses = 0;
const MAX_DISCARD_USES = 2;

// --- ELEMENTOS DEL DOM ---
const columnsElements = [
    document.getElementById('column0'),
    document.getElementById('column1'),
    document.getElementById('column2'),
    document.getElementById('column3')
];
const scoreValueElement = document.getElementById('scoreValue');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const resetBtn = document.getElementById('resetBtn');
const deckQueueElement = document.getElementById('deckQueue');
const discardButton = document.getElementById('discardButton');

// --- LÓGICA DE GENERACIÓN ---

function generateRandomCard() {
    const values = [2, 4, 8, 16, 32];
    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
}

function getCardImage(value) {
    return CARD_IMAGES[value] || 'cartas/carta1.png'; 
}

// --- INICIALIZACIÓN Y CONTROL DEL MAZO ---

function initDeckQueue() {
    cardQueue = [
        generateRandomCard(),
        generateRandomCard(),
        generateRandomCard()
    ];
}

function renderCurrentCard() {
    if (!deckQueueElement) return;
    deckQueueElement.innerHTML = '';
    
    cardQueue.forEach((value, index) => {
        const deckCard = document.createElement('div');
        deckCard.className = 'deck-card';
        deckCard.setAttribute('data-value', value);
        deckCard.setAttribute('data-queue-index', index);
        
        const img = document.createElement('img');
        img.src = getCardImage(value);
        img.alt = `Mazo ${value}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '12px';
        img.style.display = 'block';
        img.draggable = false; // La imagen no se arrastra sola, se arrastra el contenedor
        
        // HABILITAR DRAG & DROP SOLO PARA LA PRIMERA CARTA
        if (index === 0 && gameActive) {
            deckCard.setAttribute('draggable', 'true');
            
            // Evento cuando arrancas a mover la carta
            deckCard.addEventListener('dragstart', (e) => {
                deckCard.classList.add('dragging');
                // Guardamos el tipo de dato para validar el drop
                e.dataTransfer.setData('text/plain', 'solitaire-card');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            // Evento cuando sueltas la carta en cualquier lado
            deckCard.addEventListener('dragend', () => {
                deckCard.classList.remove('dragging');
                // Quitamos el sombreado visual de todas las columnas por seguridad
                document.querySelectorAll('.column').forEach(col => col.classList.remove('drag-over'));
            });
        } else {
            deckCard.setAttribute('draggable', 'false');
        }
        
        deckCard.appendChild(img);
        deckQueueElement.appendChild(deckCard);
    });
}

// --- RENDERIZADO DEL TABLERO ---

// Renderiza de forma aislada una única columna (Evita parpadeos y recargas globales)
function renderSingleColumn(columnIndex) {
    const columnContainer = columnsElements[columnIndex];
    columnContainer.innerHTML = '';
    
    const cards = columns[columnIndex]; 
    
    cards.forEach((value, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-value', value);
        card.style.setProperty('--card-index', index);
        
        const img = document.createElement('img');
        img.src = getCardImage(value);
        img.alt = `Carta ${value}`;
        img.loading = 'lazy';
        img.draggable = false;
        
        card.appendChild(img);
        columnContainer.appendChild(card);
    });

    // LLAMAMOS AL BUSCADOR DE LÍMITES
    updateColumnCounters();
}

// Render global utilizado únicamente al iniciar o reiniciar el juego
function renderColumns() {
    for (let i = 0; i < 4; i++) {
        renderSingleColumn(i);
    }
}

// --- LÓGICA DE JUEGO Y FUSIÓN RECURSIVA ---

function recursiveMerge(columnIndex, startingIndex) {
    let column = columns[columnIndex];
    
    // Iteramos hacia atrás (hacia el fondo de la columna / índices menores de la pila)
    while (startingIndex > 0) {
        const currentCardValue = column[startingIndex];
        const cardBelowValue = column[startingIndex - 1];
        
        if (currentCardValue === cardBelowValue) {
            const newValue = currentCardValue * 2;
            
            // Colapsamos las cartas fusionadas en el arreglo
            column.splice(startingIndex, 1);
            column[startingIndex - 1] = newValue;
            
            updateScore(newValue);
            
            if (newValue === TARGET_VALUE) {
                clearColumn(columnIndex);
                return;
            }
            
            // La nueva carta fusionada pasa a ser el índice a evaluar contra lo que tiene abajo
            startingIndex--;
        } else {
            break; 
        }
    }
}

function placeCard(columnIndex) {
    if (!gameActive || cardQueue.length === 0) return false;
    
    const column = columns[columnIndex];
    const cardToPlace = cardQueue[0]; // La del frente lista para jugar es el índice 0
    
    if (column.length >= MAX_CARDS_PER_COLUMN) return false;
    
    if (column.length === 0) {
        column.push(cardToPlace);
        advanceQueue();
        renderSingleColumn(columnIndex);
        
        if (cardToPlace === TARGET_VALUE) {
            clearColumn(columnIndex);
        }
        checkGameOver();
        return true;
    }
    
    const topCardIndex = column.length - 1;
    const topCardValue = column[topCardIndex];
    
    if (cardToPlace === topCardValue) {
        const newValue = cardToPlace * 2;
        column[topCardIndex] = newValue;
        updateScore(newValue);
        
        if (newValue === TARGET_VALUE) {
            clearColumn(columnIndex);
        } else {
            recursiveMerge(columnIndex, topCardIndex);
        }
        
        advanceQueue();
        renderSingleColumn(columnIndex);
        checkGameOver();
        return true;
    } else {
        column.push(cardToPlace);
        advanceQueue();
        renderSingleColumn(columnIndex);
        checkGameOver();
        return true;
    }
}

function advanceQueue() {
    cardQueue.shift();
    cardQueue.push(generateRandomCard());
    renderCurrentCard();
}

// --- SISTEMA DE DESCARTE ---

function handleDiscard() {
    if (!gameActive || discardUses >= MAX_DISCARD_USES) return;
    
    discardUses++;
    discardButton.setAttribute('data-uses', discardUses);
    
    advanceQueue();
    
    if (discardUses >= MAX_DISCARD_USES) {
        discardButton.disabled = true;
    }
}

// --- CONTROL DE PUNTUACIÓN Y FIN DE JUEGO ---

function clearColumn(columnIndex) {
    updateScore(5000);
    const columnDiv = columnsElements[columnIndex];
    const cards = columnDiv.querySelectorAll('.card');
    
    cards.forEach(card => card.classList.add('clear'));
    
    setTimeout(() => {
        columns[columnIndex] = [];
        renderSingleColumn(columnIndex);
    }, 250);
}

function updateScore(points) {
    score += points;
    if (scoreValueElement) scoreValueElement.textContent = score;
}

function checkGameOver() {
    const allFull = columns.every(col => col.length >= MAX_CARDS_PER_COLUMN);
    if (allFull) {
        gameActive = false;
        if (gameOverOverlay) {
            gameOverOverlay.style.display = 'flex';
        }
        if (finalScoreElement) {
            finalScoreElement.textContent = score;
        }
    }
}

// --- CONTROLADORES DE EVENTOS ---

function setupEventListeners() {
    document.querySelectorAll('.column').forEach(columnEl => {
        const columnIndex = parseInt(columnEl.getAttribute('data-column-index'));
        
        // Mantener la interacción por Click clásico
        columnEl.addEventListener('click', () => {
            placeCard(columnIndex);
        });
        
        // DRAG & DROP EVENTS:
        
        // Permitir el drop anulando el comportamiento por defecto del navegador
        columnEl.addEventListener('dragover', (e) => {
            if (!gameActive || columns[columnIndex].length >= MAX_CARDS_PER_COLUMN) return;
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'move';
        });
        
        // Cuando la carta entra visualmente en el área de la columna
        columnEl.addEventListener('dragenter', (e) => {
            if (!gameActive || columns[columnIndex].length >= MAX_CARDS_PER_COLUMN) return;
            columnEl.classList.add('drag-over');
        });
        
        // Cuando la carta sale del área de la columna sin soltarse
        columnEl.addEventListener('dragleave', () => {
            columnEl.classList.remove('drag-over');
        });
        
        // Cuando finalmente se suelta la carta sobre la columna
        columnEl.addEventListener('drop', (e) => {
            e.preventDefault();
            columnEl.classList.remove('drag-over');
            
            const dragData = e.dataTransfer.getData('text/plain');
            if (dragData === 'solitaire-card') {
                placeCard(columnIndex);
            }
        });
    });
    
    if (discardButton) {
        discardButton.addEventListener('click', handleDiscard);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetGame);
    }
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', resetGame);
    }
}

function resetGame() {
    columns = [[], [], [], []];
    score = 0;
    discardUses = 0;
    gameActive = true;
    
    if (scoreValueElement) scoreValueElement.textContent = '0';
    if (gameOverOverlay) gameOverOverlay.style.display = 'none';
    
    if (discardButton) {
        discardButton.disabled = false;
        discardButton.setAttribute('data-uses', '0');
    }
    
    initDeckQueue();
    renderCurrentCard();
    renderColumns();
}

function updateColumnCounters() {
    for (let i = 0; i < 4; i++) {
        const columnWrapper = columnsElements[i].parentElement;
        const existingBadge = columnWrapper.querySelector('.column-full-badge');

        if (columns[i].length >= MAX_CARDS_PER_COLUMN) {
            columnWrapper.classList.add('column-disabled');
            
            // SI YA EXISTE EL MARCADOR, NO HACEMOS NADA (Así se queda fijo para siempre)
            if (!existingBadge) {
                const fullBadge = document.createElement('div');
                fullBadge.className = 'column-full-badge';
                fullBadge.innerText = '⚠️ LLENA';
                columnWrapper.appendChild(fullBadge);
            }
        } else {
            columnWrapper.classList.remove('column-disabled');
            // Si la columna se vacía (por ejemplo, al reiniciar el juego), entonces sí lo removemos
            if (existingBadge) {
                existingBadge.remove();
            }
        }
    }
}

// Inicialización automática de la app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    resetGame();
});