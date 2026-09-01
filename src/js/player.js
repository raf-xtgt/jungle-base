// player.js — Erwin movement, keyboard input

import { GRID_SIZE } from './map.js'

const KEY_MAP = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

export function setupKeyboardInput(gameState, onMove) {
  window.addEventListener('keydown', (e) => {
    if (gameState.gameOver || gameState.gameWon) return;

    const move = KEY_MAP[e.key];
    if (!move) return;

    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
    }

    const newX = gameState.position.x + move.dx;
    const newY = gameState.position.y + move.dy;

    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return;

    gameState.position.x = newX;
    gameState.position.y = newY;

    onMove();
  });
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
