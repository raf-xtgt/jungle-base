// ui.js — UI updates (health bar, inventory panel, log, debug panel)

import { expectedMonsters } from './monsters.js'

const PHASE_COLORS = {
  morning: '#facc15',
  dusk: '#f97316',
  night: '#6366f1'
};

export function updatePhaseIndicator(phase, dayCount) {
  const el = document.getElementById('phase-indicator');
  if (!el) return;
  el.textContent = `${phase.toUpperCase()} — Day ${dayCount}`;
  el.style.color = PHASE_COLORS[phase] || '#e0e0e0';
}

export function updateHealthBar(health, maxHealth) {
  const bar = document.getElementById('health-bar');
  const value = document.getElementById('health-value');
  const pct = Math.max(0, (health / maxHealth) * 100);

  bar.style.width = pct + '%';
  value.textContent = Math.ceil(health);

  if (health > 30) {
    bar.style.background = '#4ade80';
  } else if (health > 15) {
    bar.style.background = '#facc15';
  } else {
    bar.style.background = '#ef4444';
  }
}

export function updateInventory(inventory) {
  const panel = document.getElementById('inventory-panel');
  const items = Object.entries(inventory)
    .map(([name, count]) => `<div class="inv-row"><span>${name}</span><span>${count}</span></div>`)
    .join('');
  panel.innerHTML = '<h3>Inventory</h3>' + items;
}

export function updateToolList(registeredTools) {
  const panel = document.getElementById('tools-panel');
  const tools = [...registeredTools];
  const list = tools.length > 0
    ? tools.map(t => `<div class="tool-row">${t}</div>`).join('')
    : '<div class="tool-row empty">No tools nearby</div>';
  panel.innerHTML = '<h3>Available Tools</h3>' + list;
}

export function addLogEntry(message, tip) {
  const log = document.getElementById('agent-log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-msg">${message}</span>`;
  if (tip) {
    entry.innerHTML += `<span class="log-tip">${tip}</span>`;
  }
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

export function updateFooter(gameState) {
  const el = document.getElementById('footer');
  if (!el) return;

  if (gameState.phase === 'morning') {
    if (!gameState.baseBuilt) {
      el.textContent = 'WASD: Move | R: Interact | E: Heal';
    } else if (gameState.duskCountdown > 0) {
      el.textContent = `WASD: Move | R: Collect | E: Heal | Dusk in: ${gameState.duskCountdown}s`;
    } else if (gameState.morningTimer > 0) {
      el.textContent = `WASD: Move | R: Collect | E: Heal | Dusk in: ${gameState.morningTimer}s`;
    } else {
      el.textContent = 'WASD: Move | R: Collect | E: Heal';
    }
  } else if (gameState.phase === 'dusk') {
    el.textContent = `Planning phase. Use your AI agent to plan defenses. Time: ${gameState.planningTimer}s`;
  } else if (gameState.phase === 'night') {
    el.textContent = 'WASD/Arrows: Aim | SPACE: Fire arrow (1 wood) | R: Repair';
  }
}

export function showPlanningModal(gameState) {
  const modal = document.getElementById('planning-modal');
  if (!modal) return;
  modal.style.display = 'block';

  const nightNum = gameState.dayCount;
  const monsters = expectedMonsters(nightNum);

  document.getElementById('planning-threat').textContent =
    `Night ${nightNum} — ${monsters} slimes expected`;

  const inv = Object.entries(gameState.inventory)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  document.getElementById('planning-inventory').innerHTML =
    `<div class="section-title">Inventory</div>${inv}`;

  const defs = gameState.defenses.length > 0
    ? gameState.defenses.map(d => `${d.type} (${d.side}, dur: ${d.durability})`).join(', ')
    : 'None';
  document.getElementById('planning-defenses').innerHTML =
    `<div class="section-title">Current Defenses</div>${defs}`;
}

export function hidePlanningModal() {
  const modal = document.getElementById('planning-modal');
  if (modal) modal.style.display = 'none';
}

export function updatePlanningTimer(seconds) {
  const el = document.getElementById('planning-timer');
  if (el) el.textContent = seconds;
}

let debugPanelEl = null;

export function setupDebugPanel(toolHandlers, refreshUI, redraw) {
  if (!new URLSearchParams(window.location.search).has('debug')) return;

  const sidePanel = document.getElementById('side-panel');
  debugPanelEl = document.createElement('div');
  debugPanelEl.id = 'debug-panel';
  debugPanelEl.innerHTML = '<h3>Debug — Simulate Agent</h3>';
  sidePanel.appendChild(debugPanelEl);

  updateDebugButtons(toolHandlers, refreshUI, redraw);
}

export function updateDebugButtons(toolHandlers, refreshUI, redraw) {
  if (!debugPanelEl) return;

  const h3 = debugPanelEl.querySelector('h3');
  debugPanelEl.innerHTML = '';
  debugPanelEl.appendChild(h3);

  const SIDE_TOOLS = ['place_spike_trap', 'build_barricade', 'set_fire'];
  const SIDES = ['north', 'south', 'east', 'west'];

  for (const toolName of Object.keys(toolHandlers)) {
    if (SIDE_TOOLS.includes(toolName)) {
      for (const side of SIDES) {
        const btn = document.createElement('button');
        btn.className = 'debug-btn';
        btn.textContent = `${toolName}(${side})`;
        btn.addEventListener('click', async () => {
          const result = await toolHandlers[toolName]({ side });
          if (result && !result.error) {
            addLogEntry(`[debug] called ${toolName} on ${side}`, null);
          }
          refreshUI();
          redraw();
        });
        debugPanelEl.appendChild(btn);
      }
    } else {
      const btn = document.createElement('button');
      btn.className = 'debug-btn';
      btn.textContent = toolName;
      btn.addEventListener('click', async () => {
        const result = await toolHandlers[toolName]({});
        if (result && !result.error) {
          addLogEntry(`[debug] called ${toolName}`, null);
        }
        refreshUI();
        redraw();
      });
      debugPanelEl.appendChild(btn);
    }
  }
}
