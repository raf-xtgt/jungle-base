// player.js — Erwin movement, keyboard input, context actions

import { GRID_SIZE, isBlockedTile, isChoppableTile, getNodeFootprint, isNextToNode, PERMANENT_TYPES } from './map.js'
import { addItem, removeItem, hasItems } from './inventory.js'

const KEY_MAP = {
  ArrowUp: { dx: 0, dy: -1, dir: 'north' },
  ArrowDown: { dx: 0, dy: 1, dir: 'south' },
  ArrowLeft: { dx: -1, dy: 0, dir: 'west' },
  ArrowRight: { dx: 1, dy: 0, dir: 'east' },
  w: { dx: 0, dy: -1, dir: 'north' },
  s: { dx: 0, dy: 1, dir: 'south' },
  a: { dx: -1, dy: 0, dir: 'west' },
  d: { dx: 1, dy: 0, dir: 'east' },
};

function findNearbyResource(gameState, resourceRegistry) {
  for (const node of resourceRegistry) {
    if (node.supply > 0 && isNextToNode(gameState.position, node)) {
      return node;
    }
  }
  return null;
}

export function setupKeyboardInput(gameState, callbacks) {
  const { onMove, onAction, resourceRegistry, getGrid } = callbacks;

  window.addEventListener('keydown', (e) => {
    if (gameState.gameOver || gameState.gameWon) return;

    // Morning phase: movement + R + E
    if (gameState.phase === 'morning') {
      const move = KEY_MAP[e.key];
      if (move) {
        if (e.key.startsWith('Arrow')) e.preventDefault();
        const newX = gameState.position.x + move.dx;
        const newY = gameState.position.y + move.dy;
        const grid = getGrid();

        // Always turn, even when the way is blocked. Erwin must face a tree
        // before he can cut it.
        gameState.facingDirection = move.dir;

        const inGrid = newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE;
        const blocked = inGrid && grid && isBlockedTile(grid[newY][newX]);

        if (inGrid && !blocked) {
          gameState.position.x = newX;
          gameState.position.y = newY;
          onMove();
        } else {
          onAction(null, null);
        }
        return;
      }

      if (e.key.toLowerCase() === 'r') {
        handleRKey(gameState, resourceRegistry, getGrid(), onAction);
        return;
      }

      if (e.key.toLowerCase() === 'e') {
        handleEKey(gameState, onAction);
        return;
      }
    }

    // Night phase: arrow keys change facing, SPACE shoots, R repairs
    if (gameState.phase === 'night') {
      const move = KEY_MAP[e.key];
      if (move) {
        if (e.key.startsWith('Arrow')) e.preventDefault();
        gameState.facingDirection = move.dir;
        onAction(null, null);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        handleShootKey(gameState, onAction);
        return;
      }

      if (e.key.toLowerCase() === 'r') {
        handleRepairKey(gameState, onAction);
        return;
      }
    }
  });
}

const FACING_STEP = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  west:  { dx: -1, dy: 0 },
  east:  { dx: 1, dy: 0 }
};

function tileInFront(gameState) {
  const step = FACING_STEP[gameState.facingDirection];
  if (!step) return null;
  const x = gameState.position.x + step.dx;
  const y = gameState.position.y + step.dy;
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
  return { x, y };
}

function handleRKey(gameState, resourceRegistry, grid, onAction) {
  const px = gameState.position.x;
  const py = gameState.position.y;

  // Priority 1: build base at crash site
  if (px === 7 && py === 7 && !gameState.baseBuilt) {
    const baseCost = { wood: 5, stone: 3, rope: 2 };
    if (hasItems(gameState, baseCost)) {
      removeItem(gameState, 'wood', 5);
      removeItem(gameState, 'stone', 3);
      removeItem(gameState, 'rope', 2);
      gameState.baseBuilt = true;
      gameState.baseHealth = gameState.maxBaseHealth;
      gameState.duskCountdown = 30;
      onAction('Base built! Dusk approaches in 30 seconds.', null);
      return;
    }
    // Say what is missing. Do not fail without a message.
    const missing = Object.entries(baseCost)
      .filter(([item, need]) => (gameState.inventory[item] || 0) < need)
      .map(([item, need]) => `${need - (gameState.inventory[item] || 0)} more ${item}`)
      .join(', ');
    onAction(`Cannot build the base yet. You need ${missing}.`, null);
    return;
  }

  // Priority 2: cut down the tree Erwin faces. This gives wood and opens
  // the way. Resources sit behind a ring of jungle.
  const front = tileInFront(gameState);
  if (grid && front && isChoppableTile(grid[front.y][front.x])) {
    grid[front.y][front.x] = 'grass';
    addItem(gameState, 'wood', 1);
    if (gameState.clearedTiles) gameState.clearedTiles.add(`${front.x},${front.y}`);
    onAction('Cut down a tree. +1 wood.', 'Cut low on the trunk. A high cut wastes good wood.');
    return;
  }

  // Priority 3: collect nearby resource
  const node = findNearbyResource(gameState, resourceRegistry);
  if (node) {
    // A pond never runs dry, so its supply never goes down.
    if (!PERMANENT_TYPES.has(node.type)) node.supply -= 1;
    addItem(gameState, node.tool.yield.item, node.tool.yield.amount);
    const msg = `Collected ${node.tool.yield.amount} ${node.tool.yield.item} from ${node.type}.`;
    // When the patch is used up it goes back to plain grass. Water is part of
    // the land, so a pond stays on the map.
    if (node.supply <= 0 && grid && !PERMANENT_TYPES.has(node.type)) {
      for (const t of getNodeFootprint(node)) {
        if (grid[t.y][t.x] === t.tile) grid[t.y][t.x] = 'grass';
      }
    }
    onAction(msg, node.tool.tip);
    return;
  }

  // Nothing happened. If Erwin is near the build spot, point him at it.
  if (!gameState.baseBuilt && px >= 6 && px <= 8 && py >= 6 && py <= 8) {
    onAction('Stand on the marked tile in the middle to build the base.', null);
  }
}

function handleEKey(gameState, onAction) {
  // Priority 1: medicine (best heal)
  if (hasItems(gameState, { herbs: 2, water: 1 })) {
    removeItem(gameState, 'herbs', 2);
    removeItem(gameState, 'water', 1);
    gameState.health = Math.min(gameState.health + 25, gameState.maxHealth);
    onAction('Made medicine. +25 HP.', 'Boiled herbs lose some strength. Crush them raw for a stronger remedy.');
    return;
  }
  // Priority 2: drink water
  if (hasItems(gameState, { water: 1 })) {
    removeItem(gameState, 'water', 1);
    gameState.health = Math.min(gameState.health + 8, gameState.maxHealth);
    onAction('Drank water. +8 HP.', 'Drink before you feel thirsty. Thirst means you are already dehydrated.');
    return;
  }
  // Priority 3: eat berries
  if (hasItems(gameState, { berries: 1 })) {
    removeItem(gameState, 'berries', 1);
    gameState.health = Math.min(gameState.health + 10, gameState.maxHealth);
    onAction('Ate berries. +10 HP.', 'Eat small amounts often. A full stomach in the wild slows you down.');
    return;
  }
}

function handleShootKey(gameState, onAction) {
  if (gameState.waveActionTimer <= 0) return;
  const currentWave = gameState.waves[gameState.currentWaveIndex];
  if (!currentWave) return;

  if (gameState.facingDirection !== currentWave.side) {
    onAction('You are facing the wrong direction!', null);
    return;
  }
  if (!hasItems(gameState, { wood: 1 })) {
    onAction('No wood for arrows!', null);
    return;
  }
  removeItem(gameState, 'wood', 1);
  gameState.nightArrowsShot += 1;
  onAction(`Arrow shot! 1 monster killed on the ${currentWave.side} side.`, null);
}

function handleRepairKey(gameState, onAction) {
  if (gameState.waveActionTimer <= 0) return;
  const side = gameState.facingDirection;
  const barricade = gameState.defenses.find(d => d.type === 'barricade' && d.side === side);

  if (!barricade) {
    onAction(`No barricade on the ${side} side to repair.`, null);
    return;
  }
  if (barricade.durability >= 3) {
    onAction(`${side} barricade is at full durability.`, null);
    return;
  }
  if (!hasItems(gameState, { wood: 1 })) {
    onAction('No wood for repairs!', null);
    return;
  }
  removeItem(gameState, 'wood', 1);
  barricade.durability += 1;
  onAction(`Repaired ${side} barricade. Durability: ${barricade.durability}/3.`, null);
}

export function updateExploredTiles(gameState) {
  const px = gameState.position.x;
  const py = gameState.position.y;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = px + dx;
      const ty = py + dy;
      if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
        gameState.exploredTiles.add(`${tx},${ty}`);
      }
    }
  }
}
