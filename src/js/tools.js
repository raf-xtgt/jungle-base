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
