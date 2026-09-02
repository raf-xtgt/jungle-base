// monsters.js — monster wave generation and night resolution

const ALL_SIDES = ['north', 'south', 'east', 'west'];
const MONSTER_CONFIG = { 1: { sides: 2, perSide: 2 }, 2: { sides: 3, perSide: 2 }, 3: { sides: 4, perSide: 2 } };

export function generateWaves(dayCount) {
  const config = MONSTER_CONFIG[dayCount] || { sides: 4, perSide: 2 };
  const shuffled = [...ALL_SIDES].sort(() => Math.random() - 0.5);
  const sides = shuffled.slice(0, config.sides);
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
