import './style.css'
import { gameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, renderMap, renderFog, renderPlayer, renderGameOver } from './js/renderer.js'
import { setupKeyboardInput, updateExploredTiles } from './js/player.js'
import { startGameLoop, stopGameLoop } from './js/game.js'
import { addItem, removeItem, hasItems } from './js/inventory.js'

console.log('Erwin is alive');

// Inventory verification
addItem(gameState, "water", 2);
console.log('water after add 2:', gameState.inventory.water);
console.log('hasItems water:3 =', hasItems(gameState, { water: 3 }));
console.log('hasItems water:1 =', hasItems(gameState, { water: 1 }));
console.log('removeItem water 5 =', removeItem(gameState, "water", 5));
console.log('water after failed remove:', gameState.inventory.water);
console.log('removeItem water 1 =', removeItem(gameState, "water", 1));
console.log('water after remove 1:', gameState.inventory.water);
// Reset water back to 0 for game start
gameState.inventory.water = 0;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const grid = buildMapGrid(RESOURCE_REGISTRY);

loadTileImages(TILE_CONFIG).then((images) => {
  function redraw() {
    renderMap(ctx, grid, images, TILE_CONFIG);
    renderFog(ctx, gameState.exploredTiles, GRID_SIZE);
    renderPlayer(ctx, gameState.position);
  }

  updateExploredTiles(gameState);
  redraw();

  setupKeyboardInput(gameState, () => {
    updateExploredTiles(gameState);
    redraw();
  });

  let loopId = startGameLoop(gameState, () => {
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
});
