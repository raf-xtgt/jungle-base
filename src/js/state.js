// state.js — game state object and reset

const DEFAULTS = {
  health: 40,
  maxHealth: 100,
  position: { x: 7, y: 7 },
  inventory: {
    water: 0,
    berries: 0,
    wood: 0,
    stone: 0,
    rope: 0,
    herbs: 0
  },
  elapsedTime: 0,
  gameOver: false,
  gameWon: false
};

export const gameState = {
  health: DEFAULTS.health,
  maxHealth: DEFAULTS.maxHealth,
  position: { ...DEFAULTS.position },
  inventory: { ...DEFAULTS.inventory },
  exploredTiles: new Set(),
  registeredTools: new Set(),
  elapsedTime: DEFAULTS.elapsedTime,
  gameOver: DEFAULTS.gameOver,
  gameWon: DEFAULTS.gameWon
};

export function resetGameState() {
  gameState.health = DEFAULTS.health;
  gameState.maxHealth = DEFAULTS.maxHealth;
  gameState.position = { ...DEFAULTS.position };
  gameState.inventory = { ...DEFAULTS.inventory };
  gameState.exploredTiles = new Set();
  gameState.registeredTools = new Set();
  gameState.elapsedTime = DEFAULTS.elapsedTime;
  gameState.gameOver = DEFAULTS.gameOver;
  gameState.gameWon = DEFAULTS.gameWon;
}
