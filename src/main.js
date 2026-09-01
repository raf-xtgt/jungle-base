import './style.css'
import { gameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG } from './js/map.js'
import { loadTileImages, renderMap } from './js/renderer.js'

console.log('Erwin is alive');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const grid = buildMapGrid(RESOURCE_REGISTRY);

loadTileImages(TILE_CONFIG).then((images) => {
  renderMap(ctx, grid, images, TILE_CONFIG);
  console.log('Map rendered');
});
