let difficulty = "easy"; // padrão

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

let player, bullets, enemies, score, wave, gameRunning, mouseX, mouseY, keys;

// ---------- Classes ----------
class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.size = 20;
    this.speed = 4;
    this.angle = 0;
    this.lives = 1; // apenas 1 vida
  }

  update() {
    // Movimentação WASD
    if (keys["w"]) this.y -= this.speed;
    if (keys["s"]) this.y += this.speed;
    if (keys["a"]) this.x -= this.speed;
    if (keys["d"]) this.x += this.speed;

    // Limites da tela
    this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
    this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));

    // Girar para o ponteiro do mouse
    let dx = mouseX - this.x;
    let dy = mouseY - this.y;
    this.angle = Math.atan2(dy, dx);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2); // alinhamento da nave
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(-this.size / 2, this.size);
    ctx.lineTo(this.size / 2, this.size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.size = 5;
    this.speed = 7;
    this.angle = angle;
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  draw() {
    ctx.fillStyle = "yellow";
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 20;

    let baseSpeed = 5;
    if (difficulty === "medium") baseSpeed = 10;
    if (difficulty === "hard") baseSpeed = 17;

    this.speedX = (Math.random() - 0.5) * baseSpeed;
    this.speedY = (Math.random() - 0.5) * baseSpeed;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }

  draw() {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- Funções ----------
function startGame() {
  document.getElementById("menu").classList.add("hidden");
  canvas.classList.remove("hidden");
  document.getElementById("levelSelect").classList.add("hidden");
  document.getElementById("gameCanvas").classList.remove("hidden");

  // Tocar música de fundo
  let music = document.getElementById("bgMusic");
  music.volume = 1; // volume moderado
  music.play();

  player = new Player();
  bullets = [];
  enemies = [];
  score = 0;
  wave = 1;
  gameRunning = true;

  spawnEnemies(5);

  gameLoop();
}

function spawnEnemies(count) {
  enemies = [];
  for (let i = 0; i < count; i++) {
    let side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = Math.random() * canvas.width; y = 0; }
    else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height; }
    else if (side === 2) { x = 0; y = Math.random() * canvas.height; }
    else { x = canvas.width; y = Math.random() * canvas.height; }

    enemies.push(new Enemy(x, y));
  }
}

function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();
  player.draw();

  bullets.forEach((b, i) => {
    b.update();
    b.draw();
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(i, 1);
    }
  });

  enemies.forEach((e, ei) => {
    e.update();
    e.draw();

    // Colisão tiro x inimigo
    bullets.forEach((b, bi) => {
      let dx = e.x - b.x;
      let dy = e.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < e.size) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        score += 100;
      }
    });

    // Colisão jogador x inimigo
    let dx = e.x - player.x;
    let dy = e.y - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < e.size + player.size / 2) {
      player.lives -= 1;
      if (player.lives <= 0) {
        endGame();
      }
    }
  });

  if (enemies.length === 0) {
    if (wave === 1) { wave++; spawnEnemies(10); }
    else if (wave === 2) { wave++; spawnEnemies(15); }
    else endGame();
  }

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Pontuação: " + score, 10, 20);
  ctx.fillText("Vidas: " + player.lives, 10, 50);

  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  canvas.classList.add("hidden");
  document.getElementById("gameOver").classList.remove("hidden");
  document.getElementById("finalScore").innerText = "Sua pontuação: " + score;
}

function saveScore() {
  const name = document.getElementById("playerName").value || "Anônimo";
  let ranking = JSON.parse(localStorage.getItem("ranking")) || [];
  ranking.push({ name, score });
  ranking.sort((a, b) => b.score - a.score);
  localStorage.setItem("ranking", JSON.stringify(ranking));
  document.getElementById("gameOver").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

function showRanking() {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("gameOver").classList.add("hidden");
  canvas.classList.add("hidden");
  document.getElementById("rankingScreen").classList.remove("hidden");

  let ranking = JSON.parse(localStorage.getItem("ranking")) || [];
  let list = document.getElementById("rankingList");
  list.innerHTML = "";
  ranking.forEach(r => {
    let li = document.createElement("li");
    li.textContent = `${r.name}: ${r.score}`;
    list.appendChild(li);
  });
}

document.getElementById("btnVoltar").addEventListener("click", () => {
  document.getElementById("rankingScreen").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
});


// ---------- Controles ----------
keys = {};
document.addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
document.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

document.getElementById("btnRanking").addEventListener("click", showRanking);
document.getElementById("btnVoltar").addEventListener("click", () => {
  document.getElementById("ranking").classList.add("hidden");
});
document.getElementById("saveScore").addEventListener("click", saveScore);

canvas.addEventListener("mousemove", (e) => {
  mouseX = e.offsetX;
  mouseY = e.offsetY;
});
document.getElementById("btnResetRanking").addEventListener("click", () => {
  localStorage.removeItem("ranking");
  document.getElementById("rankingList").innerHTML = "";
});

canvas.addEventListener("click", () => {
  bullets.push(new Bullet(player.x, player.y, player.angle));
});

document.getElementById("btnPlay").addEventListener("click", () => {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("levelSelect").classList.remove("hidden");
});

document.getElementById("btnBackToMenu").addEventListener("click", () => {
  document.getElementById("levelSelect").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
});

document.getElementById("btnEasy").addEventListener("click", () => {
  difficulty = "easy";
  startGame();
});

document.getElementById("btnMedium").addEventListener("click", () => {
  difficulty = "medium";
  startGame();
});

document.getElementById("btnHard").addEventListener("click", () => {
  difficulty = "hard";
  startGame();
});