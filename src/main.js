import './style.css'
import { gameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, renderMap, renderFog, renderPlayer } from './js/renderer.js'
import { setupKeyboardInput, updateExploredTiles } from './js/player.js'
import { startGameLoop, stopGameLoop } from './js/game.js'

console.log('Erwin is alive');

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
      console.log('GAME OVER — Erwin did not make it');
    }
    console.log(`health: ${gameState.health.toFixed(1)}  time: ${gameState.elapsedTime}s`);
  });

  console.log('Game ready — use arrow keys or WASD to move');
});
