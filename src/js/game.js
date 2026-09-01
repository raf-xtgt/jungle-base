// game.js — game loop, tick, win/lose checks

export function startGameLoop(gameState, onTick) {
  const intervalId = setInterval(() => {
    if (gameState.gameOver || gameState.gameWon) return;

    gameState.elapsedTime += 1;
    gameState.health -= 0.2;

    if (gameState.health < 0) gameState.health = 0;
    if (gameState.health > gameState.maxHealth) gameState.health = gameState.maxHealth;

    if (gameState.health <= 0) {
      gameState.gameOver = true;
    }

    onTick();
  }, 1000);

  return intervalId;
}

export function stopGameLoop(intervalId) {
  clearInterval(intervalId);
}
