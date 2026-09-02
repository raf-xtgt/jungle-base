import './style.css'
import { gameState, resetGameState } from './js/state.js'
import { RESOURCE_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, renderMap, renderFog, renderPlayer, renderGameOver, renderStartScreen, renderBase, renderDefenses, renderNightOverlay, renderDuskOverlay, renderWaveText, renderWolves } from './js/renderer.js'
import { setupKeyboardInput, updateExploredTiles } from './js/player.js'
import { startGameLoop, stopGameLoop } from './js/game.js'
import { updateHealthBar, updateInventory, updateToolList, addLogEntry, setupDebugPanel, updateDebugButtons, updatePhaseIndicator, showPlanningModal, hidePlanningModal, updatePlanningTimer, updateFooter } from './js/ui.js'
import { getModelContext, registerInfoTool, clearAllResourceTools, registerDefenseTools, unregisterDefenseTools, toolHandlers } from './js/tools.js'
import { generateWaves, resolveWave } from './js/monsters.js'

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let modelContext = null;
let grid = null;
let tileImages = null;
let loopId = null;
let duskIntervalId = null;
let nightIntervalId = null;
let gameStarted = false;
let nightWaveState = null; // { phase: 'announce'|'action'|'resolve', timer: N }

function redraw() {
  renderMap(ctx, grid, tileImages, TILE_CONFIG);
  renderBase(ctx, gameState.baseBuilt);
  renderDefenses(ctx, gameState.defenses);
  renderFog(ctx, gameState.exploredTiles, GRID_SIZE);

  if (gameState.phase === 'dusk') {
    renderDuskOverlay(ctx);
  }
  if (gameState.phase === 'night') {
    renderNightOverlay(ctx);
  }

  renderPlayer(ctx, gameState.position, gameState.facingDirection);

  if (gameState.phase === 'night' && nightWaveState) {
    const wave = gameState.waves[gameState.currentWaveIndex];
    if (wave) {
      if (nightWaveState.phase === 'announce') {
        renderWaveText(ctx, `Wave ${gameState.currentWaveIndex + 1}/${gameState.waves.length}: ${wave.count} wolves from the ${wave.side.toUpperCase()}!`);
        renderWolves(ctx, wave.side, wave.count, false);
      } else if (nightWaveState.phase === 'action') {
        renderWaveText(ctx, `DEFEND! Face ${wave.side} and press SPACE to shoot. (${gameState.waveActionTimer}s)`);
        renderWolves(ctx, wave.side, wave.count, false);
      } else if (nightWaveState.phase === 'resolve') {
        renderWaveText(ctx, nightWaveState.resultText);
        if (nightWaveState.result) {
          renderWolves(ctx, wave.side, wave.count, true);
        }
      }
    }
  }
}

function refreshUI() {
  updateHealthBar(gameState.health, gameState.maxHealth);
  updateInventory(gameState.inventory);
  updateToolList(gameState.registeredTools);
  updatePhaseIndicator(gameState.phase, gameState.dayCount);
  updateFooter(gameState);
}

function onPlayerAction(message, tip) {
  if (message) addLogEntry(message, tip);
  refreshUI();
  redraw();
}

function onToolCall(toolName, result, tip) {
  if (result.error) {
    addLogEntry(`${toolName}: ${result.error}`, null);
  } else {
    addLogEntry(`Agent called ${toolName}`, tip);
  }
  refreshUI();
  redraw();
  if (gameState.phase === 'dusk') {
    showPlanningModal(gameState);
  }
}

function resetResourceSupplies() {
  for (const node of RESOURCE_REGISTRY) {
    const original = RESOURCE_REGISTRY.find(n => n.id === node.id);
    node.supply = original ? original._originalSupply : node.supply;
  }
}

function startMorningPhase() {
  gameState.phase = 'morning';
  if (gameState.dayCount > 1) {
    gameState.morningTimer = 90;
    resetResourceSupplies();
    grid = buildMapGrid(RESOURCE_REGISTRY);
    gameState.defenses = gameState.defenses.filter(d => d.type !== 'fire');
  }
  refreshUI();
  redraw();
  addLogEntry(`Day ${gameState.dayCount} begins. Collect resources.`, null);

  loopId = startGameLoop(gameState, () => {
    refreshUI();
    if (gameState.gameOver) {
      stopGameLoop(loopId);
      redraw();
      renderGameOver(ctx, false, gameState);
    }
  }, () => {
    startDuskPhase();
  });
}

function startDuskPhase() {
  if (loopId) {
    stopGameLoop(loopId);
    loopId = null;
  }

  gameState.phase = 'dusk';
  gameState.planningTimer = 90;

  registerDefenseTools(modelContext, gameState, onToolCall);
  showPlanningModal(gameState);
  refreshUI();
  redraw();
  updateDebugButtons(toolHandlers, refreshUI, redraw);

  duskIntervalId = setInterval(() => {
    gameState.planningTimer -= 1;
    updatePlanningTimer(gameState.planningTimer);
    showPlanningModal(gameState);
    refreshUI();

    if (gameState.planningTimer <= 0) {
      clearInterval(duskIntervalId);
      duskIntervalId = null;
      unregisterDefenseTools(modelContext, gameState);
      hidePlanningModal();
      updateDebugButtons(toolHandlers, refreshUI, redraw);
      addLogEntry('Night falls. Defenses are set.', null);
      startNightPhase();
    }
  }, 1000);
}

function startNightPhase() {
  gameState.phase = 'night';
  gameState.waves = generateWaves(gameState.dayCount);
  gameState.currentWaveIndex = 0;
  refreshUI();
  redraw();

  processNextWave();
}

function processNextWave() {
  if (gameState.currentWaveIndex >= gameState.waves.length) {
    endNight();
    return;
  }

  const wave = gameState.waves[gameState.currentWaveIndex];
  gameState.nightArrowsShot = 0;

  // Announce phase (2 seconds)
  nightWaveState = { phase: 'announce', timer: 2 };
  addLogEntry(`Wave ${gameState.currentWaveIndex + 1}: ${wave.count} wolves from the ${wave.side}!`, null);
  redraw();

  nightIntervalId = setInterval(() => {
    nightWaveState.timer -= 1;

    if (nightWaveState.phase === 'announce' && nightWaveState.timer <= 0) {
      // Move to action phase (8 seconds)
      nightWaveState.phase = 'action';
      nightWaveState.timer = 8;
      gameState.waveActionTimer = 8;
      redraw();
    } else if (nightWaveState.phase === 'action') {
      gameState.waveActionTimer -= 1;
      nightWaveState.timer -= 1;
      redraw();

      if (nightWaveState.timer <= 0) {
        // Resolve the wave
        const result = resolveWave(wave, gameState.defenses, gameState.nightArrowsShot);
        gameState.baseHealth -= result.baseDamage;
        if (gameState.baseHealth < 0) gameState.baseHealth = 0;
        gameState.waveActionTimer = 0;

        const resultText = `Stopped ${result.stopped}. Arrows killed ${result.arrowKills}. ${result.remaining} reached base.${result.baseDamage > 0 ? ` Base: ${gameState.baseHealth}/${gameState.maxBaseHealth} HP.` : ''}`;
        nightWaveState = { phase: 'resolve', timer: 3, result, resultText };
        addLogEntry(resultText, null);
        redraw();
        refreshUI();
      }
    } else if (nightWaveState.phase === 'resolve') {
      nightWaveState.timer -= 1;

      if (nightWaveState.timer <= 0) {
        clearInterval(nightIntervalId);
        nightIntervalId = null;

        if (gameState.baseHealth <= 0) {
          gameState.gameOver = true;
          nightWaveState = null;
          redraw();
          renderGameOver(ctx, false, gameState);
          return;
        }

        gameState.currentWaveIndex += 1;
        processNextWave();
      }
    }
  }, 1000);
}

function endNight() {
  nightWaveState = null;

  if (gameState.dayCount >= 3) {
    gameState.gameWon = true;
    redraw();
    renderGameOver(ctx, true, gameState);
    addLogEntry('Rescue arrived! Erwin survived!', null);
    return;
  }

  gameState.dayCount += 1;
  addLogEntry(`Night survived! Dawn breaks on day ${gameState.dayCount}.`, null);
  startMorningPhase();
}

function applyDebugPhaseShortcut() {
  const params = new URLSearchParams(window.location.search);
  const phase = params.get('phase');
  if (!phase) return null;

  if (phase === 'dusk' || phase === 'night') {
    gameState.baseBuilt = true;
    gameState.baseHealth = 20;
    gameState.inventory = { wood: 10, stone: 6, rope: 4, herbs: 6, water: 4, berries: 6 };
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        gameState.exploredTiles.add(`${x},${y}`);
      }
    }
  }

  if (phase === 'night') {
    gameState.defenses.push({ type: 'spike_trap', side: 'north', durability: 1 });
    gameState.defenses.push({ type: 'barricade', side: 'south', durability: 3 });
  }

  return phase;
}

function initGame() {
  for (const node of RESOURCE_REGISTRY) {
    if (node._originalSupply === undefined) {
      node._originalSupply = node.supply;
    }
  }

  resetGameState();
  resetResourceSupplies();

  if (nightIntervalId) { clearInterval(nightIntervalId); nightIntervalId = null; }
  if (duskIntervalId) { clearInterval(duskIntervalId); duskIntervalId = null; }
  if (loopId) { stopGameLoop(loopId); loopId = null; }
  nightWaveState = null;

  clearAllResourceTools(modelContext, gameState, RESOURCE_REGISTRY);
  for (const key of Object.keys(toolHandlers)) {
    delete toolHandlers[key];
  }

  grid = buildMapGrid(RESOURCE_REGISTRY);

  registerInfoTool(modelContext, gameState, RESOURCE_REGISTRY);

  const debugPhase = applyDebugPhaseShortcut();

  updateExploredTiles(gameState);
  redraw();
  refreshUI();
  updateDebugButtons(toolHandlers, refreshUI, redraw);

  const logEl = document.getElementById('agent-log');
  const h3 = logEl.querySelector('h3');
  logEl.innerHTML = '';
  if (h3) logEl.appendChild(h3);

  if (debugPhase === 'dusk') {
    startDuskPhase();
  } else if (debugPhase === 'night') {
    startNightPhase();
  } else {
    loopId = startGameLoop(gameState, () => {
      refreshUI();
      if (gameState.gameOver) {
        stopGameLoop(loopId);
        redraw();
        renderGameOver(ctx, false, gameState);
      }
      if (gameState.gameWon) {
        stopGameLoop(loopId);
        redraw();
        renderGameOver(ctx, true, gameState);
      }
    }, () => {
      startDuskPhase();
    });
  }

  gameStarted = true;
}

loadTileImages(TILE_CONFIG).then((images) => {
  tileImages = images;
  grid = buildMapGrid(RESOURCE_REGISTRY);
  modelContext = getModelContext();
  console.log('modelContext:', modelContext);

  renderStartScreen(ctx);

  setupDebugPanel(toolHandlers, refreshUI, redraw);

  setupKeyboardInput(gameState, {
    onMove: () => {
      updateExploredTiles(gameState);
      redraw();
      refreshUI();
      updateDebugButtons(toolHandlers, refreshUI, redraw);
    },
    onAction: onPlayerAction,
    resourceRegistry: RESOURCE_REGISTRY,
    getGrid: () => grid
  });

  window.addEventListener('keydown', (e) => {
    if (!gameStarted && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
      initGame();
      return;
    }

    if ((gameState.gameOver || gameState.gameWon) && e.key.toLowerCase() === 'r') {
      initGame();
    }
  });
});
