// map.js — map grid data, tile config

export const GRID_SIZE = 15;

export const TILE_CONFIG = {
  grass:      { file: "rpgTile004.png", fallback: "#4a7c59" },
  water:      { file: "rpgTile010.png", fallback: "#3d85c6" },
  tree:       { file: "rpgTile155.png", fallback: "#2d5a1e" },
  stone:      { file: "rpgTile131.png", fallback: "#808080" },
  berry:      { file: "rpgTile157.png", fallback: "#c44569" },
  vine:       { file: "rpgTile161.png", fallback: "#6a8d3e" },
  herb:       { file: "rpgTile159.png", fallback: "#7ec850" },
  crash_site: { file: "rpgTile144.png", fallback: "#cc6633" },
  depleted:   { file: "rpgTile004.png", fallback: "#4a7c59" }
};

export function buildMapGrid(resourceRegistry) {
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push("grass");
    }
    grid.push(row);
  }

  grid[7][7] = "crash_site";

  for (const node of resourceRegistry) {
    const { x, y } = node.position;
    grid[y][x] = node.type;
  }

  return grid;
}
