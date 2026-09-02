import './style.css'
import { gameState, resetGameState } from './js/state.js'
import { RESOURCE_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, renderMap, renderFog, renderPlayer, renderGameOver, renderStartScreen, renderBase, renderDefenses } from './js/renderer.js'
import { setupKeyboardInput, updateExploredTiles } from './js/player.js'
import { startGameLoop, stopGameLoop } from './js/game.js'
import { updateHealthBar, updateInventory, updateToolList, addLogEntry, setupDebugPanel, updateDebugButtons, updatePhaseIndicator, showPlanningModal, hidePlanningModal, updatePlanningTimer, updateFooter } from './js/ui.js'
import { getModelContext, registerInfoTool, clearAllResourceTools, registerDefenseTools, unregisterDefenseTools, toolHandlers } from './js/tools.js'

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let modelContext = null;
let grid = null;
let tileImages = null;
let loopId = null;
let duskIntervalId = null;
let gameStarted = false;

function redraw() {
  renderMap(ctx, grid, tileImages, TILE_CONFIG);
  renderBase(ctx, gameState.baseBuilt);
  renderDefenses(ctx, gameState.defenses);
  renderFog(ctx, gameState.exploredTiles, GRID_SIZE);
  renderPlayer(ctx, gameState.position);
}

function refreshUI() {
  updateHealthBar(gameState.health, gameState.maxHealth);
  updateInventory(gameState.inventory);
  updateToolList(gameState.registeredTools);
  updatePhaseIndicator(gameState.phase, gameState.dayCount);
  updateFooter(gameState);
}

function onPlayerAction(message, tip) {
  if (message) addLogEntry(message, tip);
  refreshUI();
  redraw();
}

function onToolCall(toolName, result, tip) {
  if (result.error) {
    addLogEntry(`${toolName}: ${result.error}`, null);
  } else {
    addLogEntry(`Agent called ${toolName}`, tip);
  }
  refreshUI();
  redraw();
  if (gameState.phase === 'dusk') {
    showPlanningModal(gameState);
  }
}

function resetResourceSupplies() {
  for (const node of RESOURCE_REGISTRY) {
    const original = RESOURCE_REGISTRY.find(n => n.id === node.id);
    node.supply = original ? original._originalSupply : node.supply;
  }
}

function startDuskPhase() {
  if (loopId) {
    stopGameLoop(loopId);
    loopId = null;
  }

  gameState.phase = 'dusk';
  gameState.planningTimer = 90;

  registerDefenseTools(modelContext, gameState, onToolCall);
  showPlanningModal(gameState);
  refreshUI();
  redraw();
  updateDebugButtons(toolHandlers, refreshUI, redraw);

  duskIntervalId = setInterval(() => {
    gameState.planningTimer -= 1;
    updatePlanningTimer(gameState.planningTimer);
    showPlanningModal(gameState);
    refreshUI();

    if (gameState.planningTimer <= 0) {
      clearInterval(duskIntervalId);
      duskIntervalId = null;
      unregisterDefenseTools(modelContext, gameState);
      hidePlanningModal();
      gameState.phase = 'night';
      refreshUI();
      redraw();
      updateDebugButtons(toolHandlers, refreshUI, redraw);
      addLogEntry('Night falls. Defenses are set.', null);
    }
  }, 1000);
}

function applyDebugPhaseShortcut() {
  const params = new URLSearchParams(window.location.search);
  const phase = params.get('phase');
  if (!phase) return null;

  if (phase === 'dusk' || phase === 'night') {
    gameState.baseBuilt = true;
    gameState.baseHealth = 20;
    gameState.inventory = { wood: 10, stone: 6, rope: 4, herbs: 6, water: 4, berries: 6 };
    // Reveal all tiles so the map is visible
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        gameState.exploredTiles.add(`${x},${y}`);
      }
    }
  }

  if (phase === 'night') {
    gameState.defenses.push({ type: 'spike_trap', side: 'north', durability: 1 });
  }

  return phase;
}

function initGame() {
  for (const node of RESOURCE_REGISTRY) {
    if (node._originalSupply === undefined) {
      node._originalSupply = node.supply;
    }
  }

  resetGameState();
  resetResourceSupplies();

  clearAllResourceTools(modelContext, gameState, RESOURCE_REGISTRY);
  for (const key of Object.keys(toolHandlers)) {
    delete toolHandlers[key];
  }

  grid = buildMapGrid(RESOURCE_REGISTRY);

  registerInfoTool(modelContext, gameState, RESOURCE_REGISTRY);

  const debugPhase = applyDebugPhaseShortcut();

  updateExploredTiles(gameState);
  redraw();
  refreshUI();
  updateDebugButtons(toolHandlers, refreshUI, redraw);

  const logEl = document.getElementById('agent-log');
  const h3 = logEl.querySelector('h3');
  logEl.innerHTML = '';
  if (h3) logEl.appendChild(h3);

  if (debugPhase === 'dusk') {
    startDuskPhase();
  } else if (debugPhase === 'night') {
    gameState.phase = 'night';
    refreshUI();
    redraw();
  } else {
    loopId = startGameLoop(gameState, () => {
      refreshUI();
      if (gameState.gameOver) {
        stopGameLoop(loopId);
        redraw();
        renderGameOver(ctx, false);
      }
      if (gameState.gameWon) {
        stopGameLoop(loopId);
        redraw();
        renderGameOver(ctx, true);
      }
    }, () => {
      startDuskPhase();
    });
  }

  gameStarted = true;
}

loadTileImages(TILE_CONFIG).then((images) => {
  tileImages = images;
  grid = buildMapGrid(RESOURCE_REGISTRY);
  modelContext = getModelContext();
  console.log('modelContext:', modelContext);

  renderStartScreen(ctx);

  setupDebugPanel(toolHandlers, refreshUI, redraw);

  setupKeyboardInput(gameState, {
    onMove: () => {
      updateExploredTiles(gameState);
      redraw();
      refreshUI();
      updateDebugButtons(toolHandlers, refreshUI, redraw);
    },
    onAction: onPlayerAction,
    resourceRegistry: RESOURCE_REGISTRY,
    getGrid: () => grid
  });

  window.addEventListener('keydown', (e) => {
    if (!gameStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
      initGame();
      return;
    }

    if ((gameState.gameOver || gameState.gameWon) && e.key.toLowerCase() === 'r') {
      initGame();
    }
  });
});
