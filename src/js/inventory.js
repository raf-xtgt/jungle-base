// inventory.js — inventory add/remove/check

export function addItem(gameState, item, amount) {
  gameState.inventory[item] = (gameState.inventory[item] || 0) + amount;
  if (gameState.inventory[item] < 0) gameState.inventory[item] = 0;
}

export function removeItem(gameState, item, amount) {
  if ((gameState.inventory[item] || 0) < amount) return false;
  gameState.inventory[item] -= amount;
  return true;
}

export function hasItems(gameState, requirements) {
  for (const [item, amount] of Object.entries(requirements)) {
    if ((gameState.inventory[item] || 0) < amount) return false;
  }
  return true;
}
