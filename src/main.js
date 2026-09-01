import './style.css'
import { gameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG } from './js/map.js'
import { loadTileImages, renderMap, renderPlayer } from './js/renderer.js'
import { setupKeyboardInput } from './js/player.js'

console.log('Erwin is alive');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const grid = buildMapGrid(RESOURCE_REGISTRY);

loadTileImages(TILE_CONFIG).then((images) => {
  function redraw() {
    renderMap(ctx, grid, images, TILE_CONFIG);
    renderPlayer(ctx, gameState.position);
  }

  redraw();

  setupKeyboardInput(gameState, () => {
    redraw();
  });

  console.log('Game ready — use arrow keys or WASD to move');
});
