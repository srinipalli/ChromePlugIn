
(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  // Player
  const player = { x: W * 0.5 - 22, y: H - 50, w: 44, h: 18, speed: 300 };

  let left = false, right = false;
  let last = performance.now();
  let running = true;
  let over = false;
  let score = 0;
  let best = Number(localStorage.getItem("mini_dodge_best") || 0);
  let timeSinceSpawn = 0;
  let spawnEvery = 0.9; // seconds
  let blocks = [];

  // UI elements
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  bestEl.textContent = "Best: " + best;

  // Input
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { left = true; e.preventDefault(); }
    if (e.key === "ArrowRight") { right = true; e.preventDefault(); }
    if (e.key === "p" || e.key === "P") { running = !running; }
    if (e.key === "r" || e.key === "R") { restart(); }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") { left = false; e.preventDefault(); }
    if (e.key === "ArrowRight") { right = false; e.preventDefault(); }
  });

  // Touch controls: tap left/right halves
  canvas.addEventListener("touchstart", (e) => {
    const x = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    if (x < canvas.width / 2) { left = true; right = false; }
    else { right = true; left = false; }
  });
  canvas.addEventListener("touchend", () => { left = right = false; });

  function spawnBlock() {
    const bw = 26 + Math.random() * 24; // 26-50
    const x = Math.random() * (W - bw);
    const speed = 130 + Math.random() * 180; // px/sec
    blocks.push({ x, y: -20, w: bw, h: bw, vy: speed });
  }

  function update(dt) {
    // Difficulty scaling
    spawnEvery = Math.max(0.35, 0.9 - score * 0.01);

    // Move player
    if (left) player.x -= player.speed * dt;
    if (right) player.x += player.speed * dt;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    // Spawn & move blocks
    timeSinceSpawn += dt;
    if (timeSinceSpawn >= spawnEvery) {
      timeSinceSpawn = 0;
      spawnBlock();
    }
    blocks.forEach(b => b.y += b.vy * dt);

    // Remove off-screen & add score
    for (let i = blocks.length - 1; i >= 0; i--) {
      if (blocks[i].y > H) {
        blocks.splice(i, 1);
        score += 1;
        scoreEl.textContent = "Score: " + score;
      }
    }

    // Collision detection
    for (const b of blocks) {
      if (b.x < player.x + player.w && b.x + b.w > player.x &&
          b.y < player.y + player.h && b.y + b.h > player.y) {
        gameOver();
        break;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Player
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Blocks
    ctx.fillStyle = "#ef4444";
    for (const b of blocks) {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    if (!running && !over) {
      drawOverlay("Paused (press P)");
    }
    if (over) {
      drawOverlay("Game Over (press R)");
    }
  }

  function drawOverlay(text) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, W / 2, H / 2);
    ctx.restore();
  }

  function gameOver() {
    over = true;
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem("mini_dodge_best", String(best));
      bestEl.textContent = "Best: " + best;
    }
  }

  function restart() {
    score = 0;
    scoreEl.textContent = "Score: 0";
    blocks = [];
    player.x = W * 0.5 - player.w / 2;
    over = false;
    running = true;
    timeSinceSpawn = 0;
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - last) / 1000); // cap delta for stability
    last = ts;
    if (running && !over) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
