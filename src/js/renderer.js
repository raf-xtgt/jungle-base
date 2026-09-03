// renderer.js — canvas drawing, sprites, tiles

const spriteImages = {};

export function loadSpriteImages() {
  const sprites = {
    erwin_south: '/assets/sprites/erwin_south.png',
    erwin_north: '/assets/sprites/erwin_north.png',
    erwin_west: '/assets/sprites/erwin_west.png',
    erwin_east: '/assets/sprites/erwin_east.png',
    wolf_idle: '/assets/sprites/wolf_idle.png',
    wolf_die: '/assets/sprites/wolf_die.png',
    fire_defense: '/assets/tiles/fire.png',
    barricade_defense: '/assets/tiles/barricade_rock.png'
  };

  const promises = Object.entries(sprites).map(([key, src]) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { spriteImages[key] = img; resolve(); };
      img.onerror = () => { spriteImages[key] = null; resolve(); };
      img.src = src;
    });
  });

  return Promise.all(promises);
}

export function loadTileImages(tileConfig) {
  const entries = Object.entries(tileConfig);
  const images = {};

  const promises = entries.map(([type, config]) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[type] = img;
        resolve();
      };
      img.onerror = () => {
        images[type] = null;
        resolve();
      };
      img.src = `/assets/tiles/${config.file}`;
    });
  });

  return Promise.all(promises).then(() => images);
}

const TILE_PX = 32;

export function renderMap(ctx, grid, tileImages, tileConfig) {
  ctx.imageSmoothingEnabled = false;
  const grassImg = tileImages['grass'];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      // Draw grass underneath every tile (handles transparent backgrounds)
      if (grassImg) {
        ctx.drawImage(grassImg, x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      } else {
        ctx.fillStyle = tileConfig.grass.fallback;
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      }

      const type = grid[y][x];
      if (type === 'grass') continue;

      const img = tileImages[type];
      if (img) {
        ctx.drawImage(img, x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      } else {
        const config = tileConfig[type];
        if (config) {
          ctx.fillStyle = config.fallback;
          ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
        }
      }
    }
  }
}

export function renderFog(ctx, exploredTiles, gridSize) {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!exploredTiles.has(`${x},${y}`)) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      }
    }
  }
}

export function renderBase(ctx, baseBuilt) {
  if (!baseBuilt) return;
  for (let by = 6; by <= 8; by++) {
    for (let bx = 6; bx <= 8; bx++) {
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(bx * TILE_PX, by * TILE_PX, TILE_PX, TILE_PX);
      ctx.strokeStyle = "#5C2D0E";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx * TILE_PX, by * TILE_PX, TILE_PX, TILE_PX);
    }
  }
  ctx.fillStyle = "#e0e0e0";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", 7 * TILE_PX + TILE_PX / 2, 7 * TILE_PX + TILE_PX / 2);
}

const DEFENSE_POSITIONS = {
  north: { x: 7, y: 5 },
  south: { x: 7, y: 9 },
  west:  { x: 5, y: 7 },
  east:  { x: 9, y: 7 }
};

const DEFENSE_COLORS = {
  spike_trap: { fill: "#8B0000", label: "S" },
  barricade:  { fill: "#654321", label: "W" },
  fire:       { fill: "#FF6600", label: "F" }
};

const DEFENSE_SPRITES = {
  fire: 'fire_defense',
  barricade: 'barricade_defense'
};

export function renderDefenses(ctx, defenses) {
  for (const def of defenses) {
    const pos = DEFENSE_POSITIONS[def.side];
    if (!pos) continue;

    const spriteKey = DEFENSE_SPRITES[def.type];
    const sprite = spriteKey ? spriteImages[spriteKey] : null;

    if (sprite) {
      ctx.drawImage(sprite, pos.x * TILE_PX, pos.y * TILE_PX, TILE_PX, TILE_PX);
    } else {
      const colors = DEFENSE_COLORS[def.type];
      if (!colors) continue;
      ctx.fillStyle = colors.fill;
      ctx.fillRect(pos.x * TILE_PX, pos.y * TILE_PX, TILE_PX, TILE_PX);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x * TILE_PX, pos.y * TILE_PX, TILE_PX, TILE_PX);
      ctx.fillStyle = "#e0e0e0";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(colors.label, pos.x * TILE_PX + TILE_PX / 2, pos.y * TILE_PX + TILE_PX / 2);
    }
  }
}

export function renderPlayer(ctx, position, facingDirection) {
  const spriteKey = `erwin_${facingDirection || 'south'}`;
  const sprite = spriteImages[spriteKey];

  if (sprite) {
    ctx.drawImage(sprite, position.x * TILE_PX, position.y * TILE_PX, TILE_PX, TILE_PX);
  } else {
    const px = position.x * TILE_PX + 4;
    const py = position.y * TILE_PX + 4;
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(px, py, 24, 24);
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, 24, 24);
  }
}

export function renderNightOverlay(ctx) {
  ctx.fillStyle = "rgba(0, 0, 40, 0.4)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function renderDuskOverlay(ctx) {
  ctx.fillStyle = "rgba(255, 140, 0, 0.15)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function renderWaveText(ctx, text) {
  const w = ctx.canvas.width;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, w, 28);
  ctx.fillStyle = "#ef4444";
  ctx.fillText(text, w / 2, 6);
}

const WOLF_POSITIONS = {
  north: [{ x: 6, y: 0 }, { x: 8, y: 0 }],
  south: [{ x: 6, y: 14 }, { x: 8, y: 14 }],
  west:  [{ x: 0, y: 6 }, { x: 0, y: 8 }],
  east:  [{ x: 14, y: 6 }, { x: 14, y: 8 }]
};

export function renderWolves(ctx, side, count, dead) {
  const positions = WOLF_POSITIONS[side];
  if (!positions) return;
  const sprite = dead ? spriteImages.wolf_die : spriteImages.wolf_idle;

  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const p = positions[i];
    if (sprite) {
      ctx.drawImage(sprite, p.x * TILE_PX, p.y * TILE_PX, TILE_PX, TILE_PX);
      if (dead) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(p.x * TILE_PX, p.y * TILE_PX, TILE_PX, TILE_PX);
      }
    } else {
      ctx.fillStyle = dead ? "#555" : "#8B4513";
      ctx.fillRect(p.x * TILE_PX + 4, p.y * TILE_PX + 4, 24, 24);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dead ? "X" : "W", p.x * TILE_PX + TILE_PX / 2, p.y * TILE_PX + TILE_PX / 2);
    }
  }
}

export function renderGameOver(ctx, won, gameState) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 28px monospace";
  ctx.fillStyle = won ? "#4ade80" : "#ef4444";

  let title, subtitle;
  if (won) {
    title = "RESCUE ARRIVED!";
    subtitle = "You survived 3 nights in the jungle.";
  } else if (gameState && gameState.baseBuilt && gameState.baseHealth <= 0) {
    title = "THE BASE IS DESTROYED";
    subtitle = `Erwin did not make it through night ${gameState.dayCount}.`;
  } else {
    title = "ERWIN DIDN'T MAKE IT";
    subtitle = "He could not survive without a shelter.";
  }

  ctx.fillText(title, w / 2, h / 2 - 30);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(subtitle, w / 2, h / 2 + 10);

  ctx.font = "14px monospace";
  ctx.fillStyle = "#facc15";
  ctx.fillText("Press R to play again", w / 2, h / 2 + 50);
}

export function renderStartScreen(ctx) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 32px monospace";
  ctx.fillStyle = "#f5c542";
  ctx.fillText("ERWIN'S SURVIVAL", w / 2, h / 2 - 50);

  ctx.font = "14px monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText("Erwin has crash-landed in the jungle.", w / 2, h / 2);
  ctx.fillText("Help him survive.", w / 2, h / 2 + 22);

  ctx.font = "14px monospace";
  ctx.fillStyle = "#4ade80";
  ctx.fillText("Press any arrow key to start", w / 2, h / 2 + 60);
}
