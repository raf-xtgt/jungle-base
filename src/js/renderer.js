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
  ctx.fillText(won ? "ERWIN SURVIVED!" : "ERWIN DIDN'T MAKE IT", w / 2, h / 2 - 16);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(won ? "The shelter is built. He will survive the night." : "He could not hold on. The jungle won.", w / 2, h / 2 + 20);
}
