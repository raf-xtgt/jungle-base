import './style.css'
import { gameState } from './js/state.js'
import { RESOURCE_REGISTRY, CRAFT_REGISTRY } from './js/registry.js'
import { buildMapGrid } from './js/map.js'

console.log('Erwin is alive');

const grid = buildMapGrid(RESOURCE_REGISTRY);
console.log('grid[7][7]:', grid[7][7]);
console.log('grid[3][2]:', grid[3][2]);
console.log('grid[0][0]:', grid[0][0]);
