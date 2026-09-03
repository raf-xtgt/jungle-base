import './style.css'
import { gameState, resetGameState } from './js/state.js'
import { RESOURCE_REGISTRY } from './js/registry.js'
import { buildMapGrid, TILE_CONFIG, GRID_SIZE } from './js/map.js'
import { loadTileImages, loadSpriteImages, renderMap, renderFog, renderPlayer, renderGameOver, renderStartScreen, renderBase, renderDefenses, renderNightOverlay, renderDuskOverlay, renderWaveText, renderWolves, buildWaveWolves, renderBuildSpot, renderBow, renderArrows, WALK_FRAME_COUNT, WALK_IDLE_FRAME } from './js/renderer.js'
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
let walkFrame = WALK_IDLE_FRAME;
let walkIntervalId = null;
let walkStepsLeft = 0;

const WALK_FRAME_MS = 70;

// Arrows in flight. The interval only sets the pace; the distance comes from
// the clock, so a slow frame does not slow the arrow down.
let arrowIntervalId = null;
let arrowLastMs = 0;
const ARROW_FRAME_MS = 40;
const ARROW_TILES_PER_SEC = 9;
// Move in small steps and test every one. A single long jump could pass
// straight over a wolf without ever landing on its tile.
const ARROW_SUBSTEP = 0.34;
const ARROW_MAX_JUMP = 3;
const ARROW_STEP = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  west:  { dx: -1, dy: 0 },
  east:  { dx: 1, dy: 0 }
};

function advanceArrow(arrow, distance) {
  const step = ARROW_STEP[arrow.dir];
  if (!step) { arrow.spent = true; return; }

  let left = distance;
  while (left > 0 && !arrow.spent) {
    const move = Math.min(ARROW_SUBSTEP, left);
    arrow.x += step.dx * move;
    arrow.y += step.dy * move;
    left -= move;

    const tx = Math.round(arrow.x);
    const ty = Math.round(arrow.y);

    const wolf = gameState.waveWolves.find(w => w.alive && w.x === tx && w.y === ty);
    if (wolf) {
      wolf.alive = false;
      gameState.nightArrowsShot += 1;
      arrow.spent = true;
      addLogEntry(`Arrow hit! A wolf falls on the ${wolf.side} side.`, null);
      return;
    }

    if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) {
      arrow.spent = true;
      addLogEntry('Arrow missed.', null);
      return;
    }
  }
}

function stepArrows() {
  const now = performance.now();
  const elapsed = now - arrowLastMs;
  arrowLastMs = now;

  if (!gameState.arrows.length) return;

  const distance = Math.min((elapsed / 1000) * ARROW_TILES_PER_SEC, ARROW_MAX_JUMP);
  for (const arrow of gameState.arrows) {
    advanceArrow(arrow, distance);
  }

  gameState.arrows = gameState.arrows.filter(a => !a.spent);
  redraw();
  refreshUI();
}

function startArrowLoop() {
  if (arrowIntervalId) return;
  arrowLastMs = performance.now();
  arrowIntervalId = setInterval(stepArrows, ARROW_FRAME_MS);
}

function stopArrowLoop() {
  if (arrowIntervalId) {
    clearInterval(arrowIntervalId);
    arrowIntervalId = null;
  }
  gameState.arrows = [];
}

// The jungle sways all the time. One step every 140 ms.
let forestTick = 0;
let forestIntervalId = null;
const FOREST_FRAME_MS = 140;

function startForestAnimation() {
  if (forestIntervalId) return;
  forestIntervalId = setInterval(() => {
    forestTick += 1;
    redraw();
  }, FOREST_FRAME_MS);
}

function stopForestAnimation() {
  if (forestIntervalId) {
    clearInterval(forestIntervalId);
    forestIntervalId = null;
  }
}

// Play one short walk cycle. Each step key press restarts it.
function playWalkAnimation() {
  walkStepsLeft = WALK_FRAME_COUNT;
  if (walkIntervalId) return;

  walkIntervalId = setInterval(() => {
    walkFrame = (walkFrame + 1) % WALK_FRAME_COUNT;
    walkStepsLeft -= 1;
    redraw();

    if (walkStepsLeft <= 0) {
      clearInterval(walkIntervalId);
      walkIntervalId = null;
      walkFrame = WALK_IDLE_FRAME;
      redraw();
    }
  }, WALK_FRAME_MS);
}

function stopWalkAnimation() {
  if (walkIntervalId) {
    clearInterval(walkIntervalId);
    walkIntervalId = null;
  }
  walkStepsLeft = 0;
  walkFrame = WALK_IDLE_FRAME;
}

function redraw() {
  renderMap(ctx, grid, tileImages, TILE_CONFIG, forestTick);
  renderBase(ctx, gameState.baseBuilt);
  if (gameState.phase === 'morning') renderBuildSpot(ctx, gameState);
  renderDefenses(ctx, gameState.defenses);
  renderFog(ctx, gameState.exploredTiles, GRID_SIZE);

  if (gameState.phase === 'dusk') {
    renderDuskOverlay(ctx);
  }
  if (gameState.phase === 'night') {
    renderNightOverlay(ctx);
  }

  renderPlayer(ctx, gameState.position, gameState.facingDirection, walkFrame);

  if (gameState.phase === 'night') {
    renderBow(ctx, gameState.position, gameState.facingDirection);
  }

  if (gameState.phase === 'night' && nightWaveState) {
    const wave = gameState.waves[gameState.currentWaveIndex];
    if (wave) {
      renderWolves(ctx, gameState.waveWolves);
      renderArrows(ctx, gameState.arrows);

      if (nightWaveState.phase === 'announce') {
        renderWaveText(ctx, `Wave ${gameState.currentWaveIndex + 1}/${gameState.waves.length}: ${wave.count} wolves from the ${wave.side.toUpperCase()}!`);
      } else if (nightWaveState.phase === 'action') {
        renderWaveText(ctx, `DEFEND! Face ${wave.side} and press SPACE to shoot. (${gameState.waveActionTimer}s)`);
      } else if (nightWaveState.phase === 'resolve') {
        renderWaveText(ctx, nightWaveState.resultText);
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

// Rebuild the map, then re-open every tile Erwin has already cut.
function rebuildGrid() {
  const next = buildMapGrid(RESOURCE_REGISTRY);
  for (const key of gameState.clearedTiles) {
    const [x, y] = key.split(',').map(Number);
    if (next[y] && next[y][x] === 'forest') next[y][x] = 'grass';
  }
  return next;
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
    grid = rebuildGrid();
    gameState.defenses = gameState.defenses.filter(d => d.type !== 'fire');
  }
  refreshUI();
  redraw();
  addLogEntry(`Day ${gameState.dayCount} begins. Collect resources.`, null);

  loopId = startGameLoop(gameState, () => {
    refreshUI();
    if (gameState.gameOver) {
      stopGameLoop(loopId);
      stopForestAnimation();
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
  startArrowLoop();
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
  gameState.waveWolves = buildWaveWolves(wave.side, wave.count);
  gameState.arrows = [];

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
      // The tick at the top of this loop already counted this second down.
      // Counting again here cut the shooting window in half.
      gameState.waveActionTimer -= 1;
      redraw();

      if (nightWaveState.timer <= 0) {
        // Resolve the wave
        const result = resolveWave(wave, gameState.defenses, gameState.nightArrowsShot);

        // Defences take down whatever the arrows missed. Show it on the map.
        let toKill = gameState.waveWolves.filter(w => w.alive).length - result.remaining;
        for (const w of gameState.waveWolves) {
          if (toKill <= 0) break;
          if (w.alive) { w.alive = false; toKill -= 1; }
        }
        gameState.arrows = [];

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
          stopArrowLoop();
          stopForestAnimation();
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
  stopArrowLoop();
  gameState.waveWolves = [];

  if (gameState.dayCount >= 3) {
    gameState.gameWon = true;
    stopForestAnimation();
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
  stopArrowLoop();
  if (loopId) { stopGameLoop(loopId); loopId = null; }
  stopWalkAnimation();
  nightWaveState = null;

  clearAllResourceTools(modelContext, gameState, RESOURCE_REGISTRY);
  for (const key of Object.keys(toolHandlers)) {
    delete toolHandlers[key];
  }

  grid = rebuildGrid();

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
        stopForestAnimation();
        redraw();
        renderGameOver(ctx, false, gameState);
      }
      if (gameState.gameWon) {
        stopGameLoop(loopId);
        stopForestAnimation();
        redraw();
        renderGameOver(ctx, true, gameState);
      }
    }, () => {
      startDuskPhase();
    });
  }

  startForestAnimation();
  gameStarted = true;
}

Promise.all([loadTileImages(TILE_CONFIG), loadSpriteImages()]).then(([images]) => {
  tileImages = images;
  grid = buildMapGrid(RESOURCE_REGISTRY);
  modelContext = getModelContext();
  console.log('modelContext:', modelContext);

  renderStartScreen(ctx);

  setupDebugPanel(toolHandlers, refreshUI, redraw);

  setupKeyboardInput(gameState, {
    onMove: () => {
      updateExploredTiles(gameState);
      playWalkAnimation();
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
