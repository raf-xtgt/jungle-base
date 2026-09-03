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
  gameWon: false,
  phase: "morning",
  dayCount: 1,
  baseBuilt: false,
  baseHealth: 0,
  maxBaseHealth: 20,
  defenses: [],
  facingDirection: "south",
  morningTimer: 0,
  planningTimer: 0,
  duskCountdown: 0,
  waves: [],
  currentWaveIndex: 0,
  waveActionTimer: 0,
  nightArrowsShot: 0,
  waveWolves: [],
  arrows: []
};

export const gameState = {
  health: DEFAULTS.health,
  maxHealth: DEFAULTS.maxHealth,
  position: { ...DEFAULTS.position },
  inventory: { ...DEFAULTS.inventory },
  exploredTiles: new Set(),
  // Tiles Erwin has cut open. The jungle does not grow back over them.
  clearedTiles: new Set(),
  registeredTools: new Set(),
  elapsedTime: DEFAULTS.elapsedTime,
  gameOver: DEFAULTS.gameOver,
  gameWon: DEFAULTS.gameWon,
  phase: DEFAULTS.phase,
  dayCount: DEFAULTS.dayCount,
  baseBuilt: DEFAULTS.baseBuilt,
  baseHealth: DEFAULTS.baseHealth,
  maxBaseHealth: DEFAULTS.maxBaseHealth,
  defenses: [...DEFAULTS.defenses],
  facingDirection: DEFAULTS.facingDirection,
  morningTimer: DEFAULTS.morningTimer,
  planningTimer: DEFAULTS.planningTimer,
  duskCountdown: DEFAULTS.duskCountdown,
  waves: [...DEFAULTS.waves],
  currentWaveIndex: DEFAULTS.currentWaveIndex,
  waveActionTimer: DEFAULTS.waveActionTimer,
  nightArrowsShot: DEFAULTS.nightArrowsShot,
  waveWolves: [],
  arrows: []
};

export function resetGameState() {
  gameState.health = DEFAULTS.health;
  gameState.maxHealth = DEFAULTS.maxHealth;
  gameState.position = { ...DEFAULTS.position };
  gameState.inventory = { ...DEFAULTS.inventory };
  gameState.exploredTiles = new Set();
  gameState.clearedTiles = new Set();
  gameState.registeredTools = new Set();
  gameState.elapsedTime = DEFAULTS.elapsedTime;
  gameState.gameOver = DEFAULTS.gameOver;
  gameState.gameWon = DEFAULTS.gameWon;
  gameState.phase = DEFAULTS.phase;
  gameState.dayCount = DEFAULTS.dayCount;
  gameState.baseBuilt = DEFAULTS.baseBuilt;
  gameState.baseHealth = DEFAULTS.baseHealth;
  gameState.maxBaseHealth = DEFAULTS.maxBaseHealth;
  gameState.defenses = [...DEFAULTS.defenses];
  gameState.facingDirection = DEFAULTS.facingDirection;
  gameState.morningTimer = DEFAULTS.morningTimer;
  gameState.planningTimer = DEFAULTS.planningTimer;
  gameState.duskCountdown = DEFAULTS.duskCountdown;
  gameState.waves = [...DEFAULTS.waves];
  gameState.currentWaveIndex = DEFAULTS.currentWaveIndex;
  gameState.waveActionTimer = DEFAULTS.waveActionTimer;
  gameState.nightArrowsShot = DEFAULTS.nightArrowsShot;
  gameState.waveWolves = [];
  gameState.arrows = [];
}
