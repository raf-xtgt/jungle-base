import './style.css'
import { gameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, renderMap, renderFog, renderPlayer, renderGameOver } from './js/renderer.js'
import { setupKeyboardInput, updateExploredTiles } from './js/player.js'
import { startGameLoop, stopGameLoop } from './js/game.js'
import { updateHealthBar, updateInventory, updateToolList, addLogEntry } from './js/ui.js'
import { getModelContext, registerInfoTool, registerCraftTools, updateResourceTools, toolHandlers } from './js/tools.js'

console.log('Erwin is alive');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const modelContext = getModelContext();

const grid = buildMapGrid(RESOURCE_REGISTRY);

loadTileImages(TILE_CONFIG).then((images) => {
  function redraw() {
    renderMap(ctx, grid, images, TILE_CONFIG);
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

  registerInfoTool(modelContext, gameState, RESOURCE_REGISTRY);
  registerCraftTools(modelContext, gameState, CRAFT_REGISTRY, onToolCall);

  updateExploredTiles(gameState);
  updateResourceTools(modelContext, gameState, RESOURCE_REGISTRY, onToolCall, grid);
  redraw();
  refreshUI();

  setupKeyboardInput(gameState, () => {
    updateExploredTiles(gameState);
    updateResourceTools(modelContext, gameState, RESOURCE_REGISTRY, onToolCall, grid);
    redraw();
    refreshUI();
  });

  let loopId = startGameLoop(gameState, () => {
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

  console.log('Game ready — use arrow keys or WASD to move');
  console.log('Registered tools:', [...gameState.registeredTools]);
  console.log('toolHandlers keys:', Object.keys(toolHandlers));
});
