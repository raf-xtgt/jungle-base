// monsters.js — monster wave generation and night resolution

// Slimes only come in on a road. There is no road on the west side.
const ATTACK_SIDES = ['north', 'south', 'east'];

const MONSTER_CONFIG = {
  1: { sides: 2, perSide: 2 },   // 4 slimes
  2: { sides: 3, perSide: 2 },   // 6 slimes
  3: { sides: 3, perSide: 3 }    // 9 slimes
};

function planFor(dayCount) {
  return MONSTER_CONFIG[dayCount] || MONSTER_CONFIG[3];
}

// How many slimes the night brings. The planning tool and the modal read this,
// so all three always agree.
export function expectedMonsters(dayCount) {
  const p = planFor(dayCount);
  return Math.min(p.sides, ATTACK_SIDES.length) * p.perSide;
}

export function expectedSides(dayCount) {
  return Math.min(planFor(dayCount).sides, ATTACK_SIDES.length);
}

// Where the slimes come in and which way they crawl. Index 0 is the one
// furthest from the base, so the pack arrives single file down the road.
const SPAWN_POSITIONS = {
  north: [{ x: 7, y: 0 }, { x: 7, y: 1 }, { x: 7, y: 2 }],
  south: [{ x: 7, y: 14 }, { x: 7, y: 13 }, { x: 7, y: 12 }],
  east:  [{ x: 14, y: 7 }, { x: 13, y: 7 }, { x: 12, y: 7 }],
  west:  [{ x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }]
};

// A slime on the north road walks south, and so on. It only ever moves along
// its own road, in a straight line.
const TRAVEL_DIRECTION = {
  north: { dir: 'south', dx: 0, dy: 1 },
  south: { dir: 'north', dx: 0, dy: -1 },
  east:  { dir: 'west', dx: -1, dy: 0 },
  west:  { dir: 'east', dx: 1, dy: 0 }
};

// Three tiles brings the front slime exactly onto the defence tile, where the
// barricade, spike trap or fire sits. The ones behind queue up on the road.
export const SLIME_WALK_TILES = 3;

export function buildWaveSlimes(side, count) {
  const spawns = SPAWN_POSITIONS[side] || [];
  const travel = TRAVEL_DIRECTION[side];
  if (!travel) return [];

  const slimes = [];
  for (let i = 0; i < Math.min(count, spawns.length); i++) {
    slimes.push({
      side,
      dir: travel.dir,
      dx: travel.dx,
      dy: travel.dy,
      x: spawns[i].x,
      y: spawns[i].y,
      targetX: spawns[i].x + travel.dx * SLIME_WALK_TILES,
      targetY: spawns[i].y + travel.dy * SLIME_WALK_TILES,
      alive: true,
      clip: 'walk',
      frame: 0
    });
  }
  return slimes;
}

export function generateWaves(dayCount) {
  const config = planFor(dayCount);
  const shuffled = [...ATTACK_SIDES].sort(() => Math.random() - 0.5);
  const sides = shuffled.slice(0, Math.min(config.sides, ATTACK_SIDES.length));
  return sides.map(side => ({ side, count: config.perSide }));
}

export function resolveWave(wave, defenses, arrowsShot) {
  let remaining = wave.count;
  let spikeKills = 0;
  let fireKills = 0;
  let barricadeBlocks = 0;
  const defensesUsed = [];

  // Arrows count first. The player watched each one hit, so the numbers on
  // screen and the numbers in the result line must agree.
  const arrowKills = Math.min(remaining, arrowsShot);
  remaining -= arrowKills;

  const spike = defenses.find(d => d.type === 'spike_trap' && d.side === wave.side);
  if (spike && remaining > 0) {
    spikeKills = Math.min(remaining, 2);
    remaining -= spikeKills;
    defensesUsed.push({ type: 'spike_trap', side: wave.side, action: 'destroyed' });
  }

  const fire = defenses.find(d => d.type === 'fire' && d.side === wave.side);
  if (fire && remaining > 0) {
    fireKills = Math.min(remaining, 1);
    remaining -= fireKills;
  }

  const barricade = defenses.find(d => d.type === 'barricade' && d.side === wave.side);
  if (barricade && remaining > 0) {
    barricadeBlocks = Math.min(remaining, barricade.durability);
    remaining -= barricadeBlocks;
    barricade.durability -= barricadeBlocks;
    if (barricade.durability <= 0) {
      defensesUsed.push({ type: 'barricade', side: wave.side, action: 'destroyed' });
    }
  }

  if (spike) {
    const idx = defenses.indexOf(spike);
    if (idx !== -1) defenses.splice(idx, 1);
  }
  if (barricade && barricade.durability <= 0) {
    const idx = defenses.indexOf(barricade);
    if (idx !== -1) defenses.splice(idx, 1);
  }

  const baseDamage = remaining * 5;

  return {
    stopped: spikeKills + fireKills + barricadeBlocks,
    spikeKills,
    fireKills,
    barricadeBlocks,
    arrowKills,
    remaining,
    baseDamage
  };
}
