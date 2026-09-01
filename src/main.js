import './style.css'
import { gameState, resetGameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, renderMap, renderFog, renderPlayer, renderGameOver, renderStartScreen } from './js/renderer.js'
import { setupKeyboardInput, updateExploredTiles } from './js/player.js'
import { startGameLoop, stopGameLoop } from './js/game.js'
import { updateHealthBar, updateInventory, updateToolList, addLogEntry, setupDebugPanel, updateDebugButtons } from './js/ui.js'
import { getModelContext, registerInfoTool, registerCraftTools, updateResourceTools, clearAllResourceTools, toolHandlers } from './js/tools.js'

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const modelContext = getModelContext();

let grid = null;
let tileImages = null;
let loopId = null;
let gameStarted = false;

function redraw() {
  renderMap(ctx, grid, tileImages, TILE_CONFIG);
  renderFog(ctx, gameState.exploredTiles, GRID_SIZE);
  renderPlayer(ctx, gameState.position);
}

function refreshUI() {
  updateHealthBar(gameState.health, gameState.maxHealth);
  updateInventory(gameState.inventory);
  updateToolList(gameState.registeredTools);
}

function onToolCall(toolName, result, tip) {
  if (result.error) {
    addLogEntry(`${toolName}: ${result.error}`, null);
  } else {
    addLogEntry(`Agent called ${toolName}`, tip);
  }
  refreshUI();
  redraw();
}

function resetResourceSupplies() {
  for (const node of RESOURCE_REGISTRY) {
    const original = RESOURCE_REGISTRY.find(n => n.id === node.id);
    node.supply = original ? original._originalSupply : node.supply;
  }
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
  registerCraftTools(modelContext, gameState, CRAFT_REGISTRY, onToolCall);

  updateExploredTiles(gameState);
  updateResourceTools(modelContext, gameState, RESOURCE_REGISTRY, onToolCall, grid);
  redraw();
  refreshUI();
  updateDebugButtons(toolHandlers, refreshUI, redraw);

  const logEl = document.getElementById('agent-log');
  const h3 = logEl.querySelector('h3');
  logEl.innerHTML = '';
  if (h3) logEl.appendChild(h3);

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
  });

  gameStarted = true;
}

loadTileImages(TILE_CONFIG).then((images) => {
  tileImages = images;
  grid = buildMapGrid(RESOURCE_REGISTRY);

  renderStartScreen(ctx);

  setupDebugPanel(toolHandlers, refreshUI, redraw);

  setupKeyboardInput(gameState, () => {
    updateExploredTiles(gameState);
    updateResourceTools(modelContext, gameState, RESOURCE_REGISTRY, onToolCall, grid);
    redraw();
    refreshUI();
    updateDebugButtons(toolHandlers, refreshUI, redraw);
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
