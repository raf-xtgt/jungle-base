// map.js — map grid data, tile config

export const GRID_SIZE = 15;

export const CRASH_SITE = { x: 7, y: 7 };

// The base fills a 3x3 area. Keep it clear of forest.
export const BASE_AREA = { x0: 6, y0: 6, x1: 8, y1: 8 };

// The four defence zones. Keep them clear of forest.
export const DEFENSE_TILES = [
  [6, 5], [7, 5], [8, 5],
  [6, 9], [7, 9], [8, 9],
  [5, 6], [5, 7], [5, 8],
  [9, 6], [9, 7], [9, 8]
];

export const TILE_CONFIG = {
  grass:      { file: "grass_new.png", fallback: "#4a7c59" },
  // The forest is a 16-frame strip. Each frame is 32 wide and 46 tall, so the
  // canopy hangs over the tile above it.
  forest:     { file: "forest_tree.png", fallback: "#1e3d17", frames: 16, height: 46 },
  water:      { file: "water_new.png", fallback: "#3d85c6" },
  tree:       { file: "tree_new.png", fallback: "#2d5a1e" },
  stone:      { file: "stone_new.png", fallback: "#808080" },
  berry:      { file: "berry_fruit.png", fallback: "#c44569" },
  vine:       { file: "vine_plant.png", fallback: "#6a8d3e" },
  // The Joshua tree. Its bark gives rope. It stands taller than one tile.
  rope_tree:  { file: "rope_tree.png", fallback: "#6b4423", height: 46, drawOnTop: true },
  herb:       { file: "herb_plant.png", fallback: "#7ec850" },
  crash_site: { file: "bench.png", fallback: "#cc6633" },
  // The grass track the slimes crawl in on.
  road:       { file: "road.png", fallback: "#93a86a" },
  depleted:   { file: "stump.png", fallback: "#4a7c59" },
  // A pond is six tiles: three across and two down.
  pond_nw:    { file: "pond_nw.png", fallback: "#3d85c6" },
  pond_n:     { file: "pond_n.png",  fallback: "#3d85c6" },
  pond_ne:    { file: "pond_ne.png", fallback: "#3d85c6" },
  pond_sw:    { file: "pond_sw.png", fallback: "#3d85c6" },
  pond_s:     { file: "pond_s.png",  fallback: "#3d85c6" },
  pond_se:    { file: "pond_se.png", fallback: "#3d85c6" }
};

// How many tiles each resource covers on the map. The player can work on a
// patch from any side of it.
const NODE_FOOTPRINT = {
  water: { w: 3, h: 2 },
  berry: { w: 3, h: 2 },
  herb:  { w: 3, h: 2 },
  stone: { w: 3, h: 1 },
  vine:  { w: 3, h: 1 },
  tree:  { w: 1, h: 1 },
  rope_tree: { w: 1, h: 1 }
};

const POND_TILES = [
  ["pond_nw", "pond_n", "pond_ne"],
  ["pond_sw", "pond_s", "pond_se"]
];

// Water is part of the land. A pond never runs out and never leaves the map.
export const PERMANENT_TYPES = new Set(["water"]);

// The forest and the water stop Erwin. He must cut the forest down to pass.
// He can never walk on water.
// The monster roads: north and south along column 7, east along row 7.
export const ROAD_TILES = [
  ...[0, 1, 2, 3, 4, 5].map(y => [7, y]),
  ...[9, 10, 11, 12, 13, 14].map(y => [7, y]),
  ...[9, 10, 11, 12, 13, 14].map(x => [x, 7])
];

const BLOCKING_TILES = new Set([
  'forest', 'water',
  'pond_nw', 'pond_n', 'pond_ne',
  'pond_sw', 'pond_s', 'pond_se'
]);

export function isBlockedTile(type) {
  return BLOCKING_TILES.has(type);
}

// Only jungle can be cut down. Water blocks Erwin but he cannot cut it.
export function isChoppableTile(type) {
  return type === 'forest';
}

function inBounds(x, y) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

function inBaseArea(x, y) {
  return x >= BASE_AREA.x0 && x <= BASE_AREA.x1 && y >= BASE_AREA.y0 && y <= BASE_AREA.y1;
}

// The tiles one resource node covers, with the art for each tile.
// The patch is centred left-to-right on the node and grows downward.
export function getNodeFootprint(node) {
  const size = NODE_FOOTPRINT[node.type] || { w: 1, h: 1 };
  let x0 = node.position.x - Math.floor((size.w - 1) / 2);
  let y0 = node.position.y;

  // Keep the whole patch on the map.
  x0 = Math.max(0, Math.min(x0, GRID_SIZE - size.w));
  y0 = Math.max(0, Math.min(y0, GRID_SIZE - size.h));

  const tiles = [];
  for (let dy = 0; dy < size.h; dy++) {
    for (let dx = 0; dx < size.w; dx++) {
      const tile = node.type === 'water'
        ? POND_TILES[dy][dx]
        : node.type;
      tiles.push({ x: x0 + dx, y: y0 + dy, tile });
    }
  }
  return tiles;
}

// True when Erwin stands on or next to any tile of the patch.
export function isNextToNode(position, node) {
  return getNodeFootprint(node).some(t =>
    Math.abs(t.x - position.x) <= 1 && Math.abs(t.y - position.y) <= 1);
}

function isReserved(x, y) {
  if (inBaseArea(x, y)) return true;
  if (x === CRASH_SITE.x && y === CRASH_SITE.y) return true;
  return DEFENSE_TILES.some(([tx, ty]) => tx === x && ty === y);
}

export function buildMapGrid(resourceRegistry) {
  // 1. The whole island starts as thick jungle.
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) row.push("forest");
    grid.push(row);
  }

  // 2. Clear the crash clearing and the defence zones.
  for (let y = BASE_AREA.y0; y <= BASE_AREA.y1; y++) {
    for (let x = BASE_AREA.x0; x <= BASE_AREA.x1; x++) grid[y][x] = "grass";
  }
  for (const [x, y] of DEFENSE_TILES) grid[y][x] = "grass";

  // 3. Put the resource patches on the map.
  const footprints = new Map();
  for (const node of resourceRegistry) {
    const tiles = getNodeFootprint(node).filter(t => !isReserved(t.x, t.y));
    footprints.set(node.id, tiles);
    for (const t of tiles) grid[t.y][t.x] = t.tile;
  }
  grid[CRASH_SITE.y][CRASH_SITE.x] = "crash_site";

  // 4. Cut a narrow trail from the crash site toward each patch. Each trail
  //    stops one tile short, so the last step is always a tree.
  resourceRegistry.forEach((node, index) => {
    carveTrail(grid, CRASH_SITE, node.position, index % 2 === 0, footprints.get(node.id));
  });

  // 5. Close the jungle ring around every patch. A trail may have cut into
  //    one, so grow it back. Cut wood first, then collect.
  const patchTiles = new Set();
  for (const tiles of footprints.values()) {
    for (const t of tiles) patchTiles.add(`${t.x},${t.y}`);
  }
  for (const tiles of footprints.values()) {
    for (const t of tiles) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = t.x + dx;
          const y = t.y + dy;
          if (!inBounds(x, y)) continue;
          if (patchTiles.has(`${x},${y}`)) continue;
          if (isReserved(x, y)) continue;
          grid[y][x] = "forest";
        }
      }
    }
  }

  // 6. Lay the three dirt roads last, so no jungle grows back over them.
  //    The road runs through the defence line, so a barricade sits on it.
  //    It may take one tile from a wide patch, but never the last tile of
  //    a patch and never the base or the crash site.
  const patchSize = new Map();
  for (const [id, tiles] of footprints) patchSize.set(id, tiles.length);
  const tileOwner = new Map();
  for (const [id, tiles] of footprints) {
    for (const t of tiles) tileOwner.set(`${t.x},${t.y}`, id);
  }

  for (const [x, y] of ROAD_TILES) {
    if (!inBounds(x, y)) continue;
    if (inBaseArea(x, y)) continue;
    if (x === CRASH_SITE.x && y === CRASH_SITE.y) continue;

    const owner = tileOwner.get(`${x},${y}`);
    if (owner) {
      if (patchSize.get(owner) <= 1) continue;   // keep single-tile resources
      patchSize.set(owner, patchSize.get(owner) - 1);
    }
    grid[y][x] = "road";
  }

  return grid;
}

// Cut an L-shaped trail from `from` toward `to`. The cut stops as soon as it
// touches the patch ring, so a tree always guards the resource.
function carveTrail(grid, from, to, horizontalFirst, patch) {
  let { x, y } = from;

  const touchesPatch = () => patch.some(t =>
    Math.abs(t.x - x) <= 1 && Math.abs(t.y - y) <= 1);

  const cut = () => {
    if (touchesPatch()) return;
    if (grid[y][x] === "forest") grid[y][x] = "grass";
  };
  const stepX = () => {
    while (x !== to.x) { x += to.x > x ? 1 : -1; cut(); }
  };
  const stepY = () => {
    while (y !== to.y) { y += to.y > y ? 1 : -1; cut(); }
  };

  if (horizontalFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
}
