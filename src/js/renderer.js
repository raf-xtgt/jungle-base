// renderer.js — canvas drawing, sprites, tiles

const spriteImages = {};

export function loadSpriteImages() {
  const sprites = {
    erwin_south: '/assets/sprites/erwin_south.png',
    erwin_north: '/assets/sprites/erwin_north.png',
    erwin_west: '/assets/sprites/erwin_west.png',
    erwin_east: '/assets/sprites/erwin_east.png',
    slime_walk: '/assets/sprites/slime_walk.png',
    slime_hurt: '/assets/sprites/slime_hurt.png',
    slime_death: '/assets/sprites/slime_death.png',
    bow_north: '/assets/sprites/bow_north.png',
    bow_south: '/assets/sprites/bow_south.png',
    bow_east: '/assets/sprites/bow_east.png',
    bow_west: '/assets/sprites/bow_west.png',
    arrow_north: '/assets/sprites/arrow_north.png',
    arrow_south: '/assets/sprites/arrow_south.png',
    arrow_east: '/assets/sprites/arrow_east.png',
    arrow_west: '/assets/sprites/arrow_west.png',
    crash_plane: '/assets/tiles/crash_plane.png',
    fire_defense: '/assets/tiles/fire.png',
    spike_trap_h: '/assets/sprites/spike_trap_h.png',
    spike_trap_v: '/assets/sprites/spike_trap_v.png',
    barricade_h: '/assets/sprites/barricade_h.png',
    barricade_v: '/assets/sprites/barricade_v.png'
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

export function renderMap(ctx, grid, tileImages, tileConfig, frameTick) {
  ctx.imageSmoothingEnabled = false;
  const grassImg = tileImages['grass'];
  const tick = frameTick || 0;

  // Pass 1 — lay the ground under everything.
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grassImg) {
        ctx.drawImage(grassImg, x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      } else {
        ctx.fillStyle = tileConfig.grass.fallback;
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      }
    }
  }

  // Pass 2 — draw the objects from the top row down, so a tall canopy
  // correctly covers the row behind it. Landmarks go in a third pass.
  const onTop = [];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const type = grid[y][x];
      if (type === 'grass') continue;
      if (tileConfig[type] && tileConfig[type].drawOnTop) { onTop.push({ x, y, type }); continue; }

      const config = tileConfig[type];
      const img = tileImages[type];

      if (!img) {
        if (config) {
          ctx.fillStyle = config.fallback;
          ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
        }
        continue;
      }

      const h = (config && config.height) || TILE_PX;
      const dy = y * TILE_PX + TILE_PX - h;

      if (config && config.frames) {
        // Animated strip. Each tile gets its own offset so the jungle does
        // not sway in lockstep.
        const offset = (x * 5 + y * 3) % config.frames;
        const frame = (tick + offset) % config.frames;
        ctx.drawImage(img, frame * TILE_PX, 0, TILE_PX, h, x * TILE_PX, dy, TILE_PX, h);
      } else {
        ctx.drawImage(img, x * TILE_PX, dy, TILE_PX, h);
      }
    }
  }

  // Pass 3 — landmarks. These stand above the jungle so the player can find
  // them from far away.
  for (const item of onTop) {
    const config = tileConfig[item.type];
    const img = tileImages[item.type];
    const h = (config && config.height) || TILE_PX;
    const dy = item.y * TILE_PX + TILE_PX - h;
    if (img) {
      ctx.drawImage(img, item.x * TILE_PX, dy, TILE_PX, h);
    } else if (config) {
      ctx.fillStyle = config.fallback;
      ctx.fillRect(item.x * TILE_PX, item.y * TILE_PX, TILE_PX, TILE_PX);
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

// The crashed plane marks the spot before the base is built. It is scenery,
// not the base. The glowing tile shows exactly where to stand.
export function renderBuildSpot(ctx, gameState) {
  if (gameState.baseBuilt) return;

  const plane = spriteImages.crash_plane;
  if (plane) {
    // 96 wide by 80 tall, sitting in the middle of the 3x3 area.
    ctx.drawImage(plane, 6 * TILE_PX, 6 * TILE_PX + 8, 96, 80);
  }

  ctx.save();
  ctx.fillStyle = "rgba(250, 204, 21, 0.25)";
  ctx.fillRect(7 * TILE_PX, 7 * TILE_PX, TILE_PX, TILE_PX);
  ctx.strokeStyle = "rgba(250, 204, 21, 1)";
  ctx.lineWidth = 2;
  ctx.strokeRect(7 * TILE_PX + 1, 7 * TILE_PX + 1, TILE_PX - 2, TILE_PX - 2);

  ctx.fillStyle = "rgba(250, 204, 21, 1)";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("BUILD", 7 * TILE_PX + TILE_PX / 2, 6 * TILE_PX - 2);
  ctx.restore();
}

// A defence covers its whole zone: three of them in a line across the road
// the slimes crawl in on. The middle one sits on the road itself.
const DEFENSE_ZONES = {
  north: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }],
  south: [{ x: 6, y: 9 }, { x: 7, y: 9 }, { x: 8, y: 9 }],
  west:  [{ x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }],
  east:  [{ x: 9, y: 6 }, { x: 9, y: 7 }, { x: 9, y: 8 }]
};

const DEFENSE_COLORS = {
  spike_trap: { fill: "#8B0000", label: "S" },
  barricade:  { fill: "#654321", label: "W" },
  fire:       { fill: "#FF6600", label: "F" }
};

// North and south lie across the map, so they use the horizontal sheets.
// East and west run up and down, so they use the rotated ones. Each sheet
// holds three pieces, one per tile of the zone.
const DEFENSE_ART = {
  spike_trap: {
    h: { key: 'spike_trap_h', cw: 32, ch: 24 },
    v: { key: 'spike_trap_v', cw: 24, ch: 32 }
  },
  barricade: {
    h: { key: 'barricade_h', cw: 32, ch: 20 },
    v: { key: 'barricade_v', cw: 20, ch: 32 }
  },
  // The campfire is one square sprite, so the same art works on every side.
  fire: { single: 'fire_defense' }
};

function drawDefenseFallback(ctx, tile, type) {
  const colors = DEFENSE_COLORS[type];
  if (!colors) return;
  ctx.fillStyle = colors.fill;
  ctx.fillRect(tile.x * TILE_PX, tile.y * TILE_PX, TILE_PX, TILE_PX);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(tile.x * TILE_PX, tile.y * TILE_PX, TILE_PX, TILE_PX);
  ctx.fillStyle = "#e0e0e0";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(colors.label, tile.x * TILE_PX + TILE_PX / 2, tile.y * TILE_PX + TILE_PX / 2);
}

export function renderDefenses(ctx, defenses) {
  for (const def of defenses) {
    const zone = DEFENSE_ZONES[def.side];
    if (!zone) continue;

    const art = DEFENSE_ART[def.type];
    const horizontal = def.side === 'north' || def.side === 'south';

    for (let i = 0; i < zone.length; i++) {
      const tile = zone[i];

      if (art && art.single) {
        const sprite = spriteImages[art.single];
        if (sprite) {
          ctx.drawImage(sprite, tile.x * TILE_PX, tile.y * TILE_PX, TILE_PX, TILE_PX);
          continue;
        }
      } else if (art) {
        const cell = horizontal ? art.h : art.v;
        const sprite = spriteImages[cell.key];
        if (sprite) {
          ctx.drawImage(
            sprite,
            horizontal ? i * cell.cw : 0,
            horizontal ? 0 : i * cell.ch,
            cell.cw, cell.ch,
            tile.x * TILE_PX + (TILE_PX - cell.cw) / 2,
            tile.y * TILE_PX + (TILE_PX - cell.ch) / 2,
            cell.cw, cell.ch
          );
          continue;
        }
      }

      drawDefenseFallback(ctx, tile, def.type);
    }
  }
}

// Erwin walk strips: 4 frames per direction, laid out left to right.
// Each frame is 32 wide and 41 tall, so Erwin stands taller than one tile.
export const WALK_FRAME_COUNT = 4;
export const WALK_IDLE_FRAME = 0;
const WALK_FRAME_W = 32;
const WALK_FRAME_H = 41;

export function renderPlayer(ctx, position, facingDirection, frame) {
  const spriteKey = `erwin_${facingDirection || 'south'}`;
  const sprite = spriteImages[spriteKey];

  if (sprite) {
    const index = ((frame || 0) % WALK_FRAME_COUNT + WALK_FRAME_COUNT) % WALK_FRAME_COUNT;
    // Anchor the feet to the bottom of the tile. The extra height overlaps the tile above.
    const dx = position.x * TILE_PX;
    const dy = position.y * TILE_PX + TILE_PX - WALK_FRAME_H;
    ctx.drawImage(
      sprite,
      index * WALK_FRAME_W, 0, WALK_FRAME_W, WALK_FRAME_H,
      dx, dy, WALK_FRAME_W, WALK_FRAME_H
    );
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

// Erwin holds the bow all through the night. It points the way he faces, so
// the player can see his aim without moving him.
const BOW_OFFSET = {
  north: { dx: -13, dy: -17 },
  south: { dx: -13, dy: 7 },
  east:  { dx: 9, dy: -14 },
  west:  { dx: -19, dy: -14 }
};

export function renderBow(ctx, position, facingDirection) {
  const dir = facingDirection || 'south';
  const sprite = spriteImages[`bow_${dir}`];
  const offset = BOW_OFFSET[dir];
  if (!sprite || !offset) return;

  // Chest height on the 41 px tall walk sprite.
  const cx = position.x * TILE_PX + TILE_PX / 2;
  const cy = position.y * TILE_PX + TILE_PX - 18;
  ctx.drawImage(sprite, cx + offset.dx, cy + offset.dy, sprite.width, sprite.height);
}

// Arrows in flight. x and y are tile coordinates and may sit between tiles.
export function renderArrows(ctx, arrows) {
  if (!arrows) return;

  for (const arrow of arrows) {
    const sprite = spriteImages[`arrow_${arrow.dir}`];
    const cx = arrow.x * TILE_PX + TILE_PX / 2;
    const cy = arrow.y * TILE_PX + TILE_PX / 2;

    if (sprite) {
      ctx.drawImage(sprite, cx - sprite.width / 2, cy - sprite.height / 2, sprite.width, sprite.height);
    } else {
      ctx.fillStyle = "#f5c542";
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }
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

// Slime animation sheets. Every clip uses the same 40x30 cell and the same
// row order, so switching clips never makes the slime jump.
export const SLIME_CLIPS = {
  walk:  { key: 'slime_walk',  frames: 8,  fps: 10, loop: true },
  hurt:  { key: 'slime_hurt',  frames: 5,  fps: 20, loop: false },
  death: { key: 'slime_death', frames: 10, fps: 15, loop: false }
};

const SLIME_W = 40;
const SLIME_H = 30;
const SLIME_ROW = { north: 0, south: 1, west: 2, east: 3 };

export function renderSlimes(ctx, slimes) {
  if (!slimes) return;

  for (const slime of slimes) {
    const clip = SLIME_CLIPS[slime.clip] || SLIME_CLIPS.walk;
    const sprite = spriteImages[clip.key];

    // The slime is wider than a tile, so centre it and stand it on the
    // tile floor. x and y may sit between tiles while it crawls.
    const dx = slime.x * TILE_PX + TILE_PX / 2 - SLIME_W / 2;
    const dy = slime.y * TILE_PX + TILE_PX - SLIME_H;

    if (sprite) {
      const frame = Math.min(Math.floor(slime.frame), clip.frames - 1);
      const row = SLIME_ROW[slime.dir] ?? 1;
      ctx.drawImage(
        sprite,
        frame * SLIME_W, row * SLIME_H, SLIME_W, SLIME_H,
        dx, dy, SLIME_W, SLIME_H
      );
    } else {
      ctx.fillStyle = slime.alive ? "#8b1a1a" : "#4a2020";
      ctx.fillRect(slime.x * TILE_PX + 4, slime.y * TILE_PX + 8, 24, 20);
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
