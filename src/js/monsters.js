// monsters.js — monster wave generation and night resolution

// Wolves only come in on a road. There is no road on the west side.
const ATTACK_SIDES = ['north', 'south', 'east'];

const MONSTER_CONFIG = {
  1: { sides: 2, perSide: 2 },   // 4 wolves
  2: { sides: 3, perSide: 2 },   // 6 wolves
  3: { sides: 3, perSide: 3 }    // 9 wolves
};

function planFor(dayCount) {
  return MONSTER_CONFIG[dayCount] || MONSTER_CONFIG[3];
}

// How many wolves the night brings. The planning tool and the modal read this,
// so all three always agree.
export function expectedMonsters(dayCount) {
  const p = planFor(dayCount);
  return Math.min(p.sides, ATTACK_SIDES.length) * p.perSide;
}

export function expectedSides(dayCount) {
  return Math.min(planFor(dayCount).sides, ATTACK_SIDES.length);
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

  const arrowKills = Math.min(remaining, arrowsShot);
  remaining -= arrowKills;

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
