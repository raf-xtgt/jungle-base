// renderer.js — canvas drawing, sprites, tiles

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

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const type = grid[y][x];
      const img = tileImages[type];

      if (img) {
        ctx.drawImage(img, x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      } else {
        const config = tileConfig[type];
        ctx.fillStyle = config ? config.fallback : "#000000";
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
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

export function renderDefenses(ctx, defenses) {
  for (const def of defenses) {
    const pos = DEFENSE_POSITIONS[def.side];
    if (!pos) continue;
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

export function renderPlayer(ctx, position) {
  const px = position.x * TILE_PX + 4;
  const py = position.y * TILE_PX + 4;
  const size = 24;

  ctx.fillStyle = "#f5c542";
  ctx.fillRect(px, py, size, size);

  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, size, size);
}

export function renderGameOver(ctx, won) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 28px monospace";
  ctx.fillStyle = won ? "#4ade80" : "#ef4444";
  ctx.fillText(won ? "ERWIN SURVIVED!" : "ERWIN DIDN'T MAKE IT", w / 2, h / 2 - 30);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(won ? "The shelter is built. He will survive the night." : "He could not hold on. The jungle won.", w / 2, h / 2 + 10);

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
