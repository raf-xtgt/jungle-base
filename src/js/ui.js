// ui.js — UI updates (health bar, inventory panel, log, debug panel)

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

  for (const toolName of Object.keys(toolHandlers)) {
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
