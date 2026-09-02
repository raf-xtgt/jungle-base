// game.js — game loop, tick, win/lose checks

export function startGameLoop(gameState, onTick, onDuskTransition) {
  const intervalId = setInterval(() => {
    if (gameState.gameOver || gameState.gameWon) return;

    gameState.elapsedTime += 1;

    // Health only declines in morning before base is built
    if (gameState.phase === 'morning' && !gameState.baseBuilt) {
      gameState.health -= 0.2;
      if (gameState.health < 0) gameState.health = 0;
      if (gameState.health <= 0) {
        gameState.gameOver = true;
      }
    }

    // Dusk countdown after base is built (day 1)
    if (gameState.phase === 'morning' && gameState.baseBuilt && gameState.duskCountdown > 0) {
      gameState.duskCountdown -= 1;
      if (gameState.duskCountdown <= 0) {
        if (onDuskTransition) onDuskTransition();
        return;
      }
    }

    // Morning timer (day 2+)
    if (gameState.phase === 'morning' && gameState.baseBuilt && gameState.morningTimer > 0) {
      gameState.morningTimer -= 1;
      if (gameState.morningTimer <= 0) {
        if (onDuskTransition) onDuskTransition();
        return;
      }
    }

    if (gameState.health > gameState.maxHealth) gameState.health = gameState.maxHealth;

    onTick();
  }, 1000);

  return intervalId;
}

export function stopGameLoop(intervalId) {
  clearInterval(intervalId);
}
