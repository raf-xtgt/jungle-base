// tools.js — WebMCP registration, feature detection, toolHandlers lookup

import { addItem, removeItem, hasItems } from './inventory.js'

export const toolHandlers = {};

export function getModelContext() {
  const ctx = document.modelContext ?? navigator.modelContext ?? null;
  if (!ctx) {
    console.warn('WebMCP not available. Use ?debug=true for the debug panel.');
  }
  return ctx;
}

function getNearbyNodes(gameState, resourceRegistry) {
  const px = gameState.position.x;
  const py = gameState.position.y;
  return resourceRegistry
    .filter(n => Math.abs(n.position.x - px) <= 1 && Math.abs(n.position.y - py) <= 1 && n.supply > 0)
    .map(n => ({ id: n.id, type: n.type, supply: n.supply, tool: n.tool.name }));
}

export function registerInfoTool(modelContext, gameState, resourceRegistry) {
  const handler = async () => {
    return {
      health: gameState.health,
      maxHealth: gameState.maxHealth,
      inventory: { ...gameState.inventory },
      position: { ...gameState.position },
      nearbyNodes: getNearbyNodes(gameState, resourceRegistry),
      registeredTools: [...gameState.registeredTools],
      elapsedTime: gameState.elapsedTime,
      gameOver: gameState.gameOver,
      gameWon: gameState.gameWon
    };
  };

  toolHandlers['get_game_state'] = handler;
  gameState.registeredTools.add('get_game_state');

  if (modelContext) {
    modelContext.registerTool({
      name: 'get_game_state',
      description: "Read Erwin's current health, inventory, position, nearby resource nodes, and registered tools. Use this to decide what to do next.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async (input, { signal } = {}) => {
        const state = await handler();
        return JSON.stringify(state);
      }
    });
  }
}

const craftAbortControllers = {};

export function registerCraftTools(modelContext, gameState, craftRegistry, onToolCall) {
  for (const entry of craftRegistry) {
    const handler = async () => {
      if (!hasItems(gameState, entry.requires)) {
        const result = {
          error: 'Not enough items',
          required: entry.requires,
          current: { ...gameState.inventory }
        };
        onToolCall(entry.name, result, null);
        return result;
      }

      for (const [item, amount] of Object.entries(entry.consumes)) {
        removeItem(gameState, item, amount);
      }

      if (entry.triggersWin) {
        gameState.gameWon = true;
      } else {
        gameState.health = Math.min(gameState.health + entry.healthChange, gameState.maxHealth);
      }

      const result = {
        success: true,
        tool: entry.name,
        health: gameState.health,
        inventory: { ...gameState.inventory }
      };

      onToolCall(entry.name, result, entry.tip);
      return result;
    };

    toolHandlers[entry.name] = handler;
    gameState.registeredTools.add(entry.name);

    if (modelContext) {
      const controller = new AbortController();
      craftAbortControllers[entry.name] = controller;

      modelContext.registerTool({
        name: entry.name,
        description: entry.description,
        inputSchema: { type: 'object', properties: {} },
        annotations: { readOnlyHint: false },
        execute: async (input, { signal } = {}) => {
          const result = await handler();
          return JSON.stringify(result);
        }
      }, { signal: controller.signal });
    }
  }
}

const resourceAbortControllers = {};
const activeResourceTools = new Set();

export function updateResourceTools(modelContext, gameState, resourceRegistry, onToolCall, grid) {
  const px = gameState.position.x;
  const py = gameState.position.y;

  for (const node of resourceRegistry) {
    const inRange = Math.abs(node.position.x - px) <= 1 && Math.abs(node.position.y - py) <= 1;
    const toolName = node.tool.name + '_' + node.id;
    const isRegistered = activeResourceTools.has(node.id);

    if (inRange && node.supply > 0 && !isRegistered) {
      const handler = async () => {
        if (node.supply <= 0) {
          return { error: 'This resource is depleted.' };
        }

        node.supply -= 1;
        addItem(gameState, node.tool.yield.item, node.tool.yield.amount);

        const result = {
          success: true,
          item: node.tool.yield.item,
          amount: node.tool.yield.amount,
          remainingSupply: node.supply,
          health: gameState.health,
          inventory: { ...gameState.inventory }
        };

        if (node.supply <= 0) {
          activeResourceTools.delete(node.id);
          gameState.registeredTools.delete(toolName);
          delete toolHandlers[toolName];
          if (grid) {
            grid[node.position.y][node.position.x] = 'depleted';
          }
          if (modelContext && resourceAbortControllers[node.id]) {
            resourceAbortControllers[node.id].abort();
            delete resourceAbortControllers[node.id];
          }
        }

        onToolCall(node.tool.name, result, node.tool.tip);
        return result;
      };

      toolHandlers[toolName] = handler;
      activeResourceTools.add(node.id);
      gameState.registeredTools.add(toolName);

      if (modelContext) {
        const controller = new AbortController();
        resourceAbortControllers[node.id] = controller;

        modelContext.registerTool({
          name: toolName,
          description: node.tool.description + ` (${node.supply} uses left)`,
          inputSchema: { type: 'object', properties: {} },
          annotations: { readOnlyHint: false },
          execute: async (input, { signal } = {}) => {
            const result = await handler();
            return JSON.stringify(result);
          }
        }, { signal: controller.signal });
      }

    } else if (!inRange && isRegistered) {
      activeResourceTools.delete(node.id);
      gameState.registeredTools.delete(toolName);
      delete toolHandlers[toolName];

      if (modelContext && resourceAbortControllers[node.id]) {
        resourceAbortControllers[node.id].abort();
        delete resourceAbortControllers[node.id];
      }
    }
  }
}

const DEFENSE_COSTS = {
  spike_trap: { wood: 2, stone: 1 },
  barricade: { wood: 3 },
  fire: { wood: 1, herbs: 1 }
};

const MONSTER_COUNTS = { 1: 4, 2: 6, 3: 8 };
const SIDES_COUNTS = { 1: 2, 2: 3, 3: 4 };

const defenseAbortControllers = {};
const DEFENSE_TOOL_NAMES = ['get_planning_context', 'place_spike_trap', 'build_barricade', 'set_fire'];

export function registerDefenseTools(modelContext, gameState, onToolCall) {
  const sideSchema = {
    type: 'object',
    properties: {
      side: { type: 'string', enum: ['north', 'south', 'east', 'west'], description: 'Which side of the base to place the defense' }
    },
    required: ['side']
  };

  // get_planning_context
  const planningHandler = async () => {
    if (gameState.phase !== 'dusk') {
      return { error: 'This tool is only available during the planning phase.' };
    }
    const nightNum = gameState.dayCount;
    const result = {
      nightNumber: nightNum,
      expectedMonsters: MONSTER_COUNTS[nightNum] || 8,
      expectedSides: SIDES_COUNTS[nightNum] || 4,
      inventory: { ...gameState.inventory },
      defenses: gameState.defenses.map(d => ({ ...d })),
      baseHealth: gameState.baseHealth,
      maxBaseHealth: gameState.maxBaseHealth,
      planningTimeRemaining: gameState.planningTimer,
      availableDefenses: [
        { tool: 'place_spike_trap', cost: { wood: 2, stone: 1 }, effect: 'Kills up to 2 monsters. Destroyed after use.' },
        { tool: 'build_barricade', cost: { wood: 3 }, effect: 'Blocks monsters. 3 durability. Survives across nights.' },
        { tool: 'set_fire', cost: { wood: 1, herbs: 1 }, effect: 'Kills 1 monster per wave. Lasts 1 night.' }
      ]
    };
    onToolCall('get_planning_context', result, null);
    return result;
  };
  toolHandlers['get_planning_context'] = planningHandler;
  gameState.registeredTools.add('get_planning_context');

  if (modelContext) {
    const ctrl = new AbortController();
    defenseAbortControllers['get_planning_context'] = ctrl;
    modelContext.registerTool({
      name: 'get_planning_context',
      description: 'Read the current defense planning context. Returns inventory, existing defenses, base health, expected monsters, and available defense options. Call this first to understand the situation before placing defenses.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => JSON.stringify(await planningHandler())
    }, { signal: ctrl.signal });
  }

  // place_spike_trap
  const spikeHandler = async (input) => {
    if (gameState.phase !== 'dusk') {
      return { error: 'This tool is only available during the planning phase.' };
    }
    const side = input?.side;
    if (!['north', 'south', 'east', 'west'].includes(side)) {
      return { error: 'Invalid side. Use north, south, east, or west.' };
    }
    if (gameState.defenses.some(d => d.type === 'spike_trap' && d.side === side)) {
      return { error: `A spike trap already exists on the ${side} side.` };
    }
    const cost = DEFENSE_COSTS.spike_trap;
    if (!hasItems(gameState, cost)) {
      return { error: 'Not enough items', required: cost, current: { ...gameState.inventory } };
    }
    for (const [item, amount] of Object.entries(cost)) {
      removeItem(gameState, item, amount);
    }
    gameState.defenses.push({ type: 'spike_trap', side, durability: 1 });
    const result = { success: true, defense: 'spike_trap', side, inventory: { ...gameState.inventory } };
    onToolCall('place_spike_trap', result, 'Sharp stakes in the ground. Wolves will not see them in the dark.');
    return result;
  };
  toolHandlers['place_spike_trap'] = spikeHandler;
  gameState.registeredTools.add('place_spike_trap');

  if (modelContext) {
    const ctrl = new AbortController();
    defenseAbortControllers['place_spike_trap'] = ctrl;
    modelContext.registerTool({
      name: 'place_spike_trap',
      description: 'Place a spike trap on one side of the base. Costs 2 wood and 1 stone. Kills up to 2 monsters on that side, then destroyed. One spike trap per side.',
      inputSchema: sideSchema,
      annotations: { readOnlyHint: false },
      execute: async (input) => JSON.stringify(await spikeHandler(input))
    }, { signal: ctrl.signal });
  }

  // build_barricade
  const barricadeHandler = async (input) => {
    if (gameState.phase !== 'dusk') {
      return { error: 'This tool is only available during the planning phase.' };
    }
    const side = input?.side;
    if (!['north', 'south', 'east', 'west'].includes(side)) {
      return { error: 'Invalid side. Use north, south, east, or west.' };
    }
    if (gameState.defenses.some(d => d.type === 'barricade' && d.side === side)) {
      return { error: `A barricade already exists on the ${side} side.` };
    }
    const cost = DEFENSE_COSTS.barricade;
    if (!hasItems(gameState, cost)) {
      return { error: 'Not enough items', required: cost, current: { ...gameState.inventory } };
    }
    for (const [item, amount] of Object.entries(cost)) {
      removeItem(gameState, item, amount);
    }
    gameState.defenses.push({ type: 'barricade', side, durability: 3 });
    const result = { success: true, defense: 'barricade', side, inventory: { ...gameState.inventory } };
    onToolCall('build_barricade', result, 'Stacked logs make a wall. Not pretty, but strong.');
    return result;
  };
  toolHandlers['build_barricade'] = barricadeHandler;
  gameState.registeredTools.add('build_barricade');

  if (modelContext) {
    const ctrl = new AbortController();
    defenseAbortControllers['build_barricade'] = ctrl;
    modelContext.registerTool({
      name: 'build_barricade',
      description: 'Build a wood barricade on one side of the base. Costs 3 wood. Blocks monsters with 3 durability (loses 1 per block). Survives across nights if not destroyed. One barricade per side.',
      inputSchema: sideSchema,
      annotations: { readOnlyHint: false },
      execute: async (input) => JSON.stringify(await barricadeHandler(input))
    }, { signal: ctrl.signal });
  }

  // set_fire
  const fireHandler = async (input) => {
    if (gameState.phase !== 'dusk') {
      return { error: 'This tool is only available during the planning phase.' };
    }
    const side = input?.side;
    if (!['north', 'south', 'east', 'west'].includes(side)) {
      return { error: 'Invalid side. Use north, south, east, or west.' };
    }
    if (gameState.defenses.some(d => d.type === 'fire' && d.side === side)) {
      return { error: `A fire already exists on the ${side} side.` };
    }
    const cost = DEFENSE_COSTS.fire;
    if (!hasItems(gameState, cost)) {
      return { error: 'Not enough items', required: cost, current: { ...gameState.inventory } };
    }
    for (const [item, amount] of Object.entries(cost)) {
      removeItem(gameState, item, amount);
    }
    gameState.defenses.push({ type: 'fire', side, durability: 1 });
    const result = { success: true, defense: 'fire', side, inventory: { ...gameState.inventory } };
    onToolCall('set_fire', result, 'Fire keeps predators away. Keep it burning through the night.');
    return result;
  };
  toolHandlers['set_fire'] = fireHandler;
  gameState.registeredTools.add('set_fire');

  if (modelContext) {
    const ctrl = new AbortController();
    defenseAbortControllers['set_fire'] = ctrl;
    modelContext.registerTool({
      name: 'set_fire',
      description: 'Set a defensive fire on one side of the base. Costs 1 wood and 1 herbs. Kills 1 monster per wave on this side. Lasts 1 night only. One fire per side.',
      inputSchema: sideSchema,
      annotations: { readOnlyHint: false },
      execute: async (input) => JSON.stringify(await fireHandler(input))
    }, { signal: ctrl.signal });
  }
}

export function unregisterDefenseTools(modelContext, gameState) {
  for (const name of DEFENSE_TOOL_NAMES) {
    delete toolHandlers[name];
    gameState.registeredTools.delete(name);
    if (modelContext && defenseAbortControllers[name]) {
      defenseAbortControllers[name].abort();
      delete defenseAbortControllers[name];
    }
  }
}

export function clearAllResourceTools(modelContext, gameState, resourceRegistry) {
  for (const node of resourceRegistry) {
    const toolName = node.tool.name + '_' + node.id;
    if (activeResourceTools.has(node.id)) {
      activeResourceTools.delete(node.id);
      gameState.registeredTools.delete(toolName);
      delete toolHandlers[toolName];
      if (modelContext && resourceAbortControllers[node.id]) {
        resourceAbortControllers[node.id].abort();
        delete resourceAbortControllers[node.id];
      }
    }
  }
}
