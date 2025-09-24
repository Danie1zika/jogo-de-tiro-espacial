// script.js - lógica completa e robusta

/* -------------------------
   ELEMENTOS & VARIÁVEIS
   ------------------------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const btnPlay = document.getElementById('btnPlay');
const btnRanking = document.getElementById('btnRanking');
const btnBackToMenu = document.getElementById('btnBackToMenu');
const btnEasy = document.getElementById('btnEasy');
const btnMedium = document.getElementById('btnMedium');
const btnHard = document.getElementById('btnHard');
const btnVoltar = document.getElementById('btnVoltar');
const btnResetRanking = document.getElementById('btnResetRanking');
const rankingListEl = document.getElementById('rankingList');

const levelTransitionEl = document.getElementById('levelTransition');
const transitionMessageEl = document.getElementById('transitionMessage');
const transitionCountdownEl = document.getElementById('transitionCountdown');

const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const playerNameInput = document.getElementById('playerName');
const saveScoreBtn = document.getElementById('saveScore');

const bgMusic = document.getElementById('bgMusic');
const shootSound = document.getElementById('shootSound');
const explosionSound = document.getElementById('explosionSound');
const playerExplosionSound = document.getElementById('playerExplosionSound');

let keys = {};
let mouse = { x: canvas.width/2, y: canvas.height/2 };

let player, bullets, enemies;
let score = 0;
let animationId = null;
let isGameRunning = false;

const WAVES = [5,10,15];
const LEVELS = ['easy','medium','hard'];
const SPEED_BY_LEVEL = { easy: 2, medium: 5, hard: 7 };

let currentLevelIndex = 0;
let currentWaveIndex = 0;
let difficulty = 'easy';
let shotCooldown = 180; // ms
let lastShotAt = 0;

/* -------------------------
   UTIL: show/hide
   ------------------------- */
function show(id){ document.getElementById(id).classList.remove('hidden'); }
function hide(id){ document.getElementById(id).classList.add('hidden'); }

/* -------------------------
   ENTIDADES
   ------------------------- */
class Player {
  constructor() {
    this.x = canvas.width/2;
    this.y = canvas.height/2;
    this.size = 18;
    this.speed = 4;
    this.angle = 0;
    this.lives = 1;
  }
  update() {
    // movimento por teclas (WASD + setas)
    if (keys.w) this.y -= this.speed;
    if (keys.s) this.y += this.speed;
    if (keys.a) this.x -= this.speed;
    if (keys.d) this.x += this.speed;

    // limites
    this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x));
    this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y));

    // mira para o mouse
    let dx = mouse.x - this.x;
    let dy = mouse.y - this.y;
    this.angle = Math.atan2(dy, dx);
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI/2);
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.lineTo(-this.size*0.6, this.size);
    ctx.lineTo(this.size*0.6, this.size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class Bullet {
  constructor(x,y,angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 7.5;
    this.size = 5;
  }
  update(){
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }
  draw(){
    ctx.fillStyle = "yellow";
    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
  }
}

class Enemy {
  constructor(x,y, speedFactor) {
    this.x = x;
    this.y = y;
    this.size = 16;
    let base = (Math.random() * speedFactor) + (speedFactor*0.2);
    this.vx = (Math.random() - 0.5) * base * 1.2;
    this.vy = (Math.random() - 0.5) * base * 1.2;
  }
  update(){
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }
  draw(){
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fill();
  }
}

/* -------------------------
   SPAWN & NÍVEIS
   ------------------------- */
function spawnWave(waveIndex){
  enemies = [];
  let count = WAVES[waveIndex];
  let speedFactor = SPEED_BY_LEVEL[difficulty];
  for (let i=0;i<count;i++){
    let side = Math.floor(Math.random()*4);
    let x, y;
    if (side===0){ x=Math.random()*canvas.width; y=0; }
    else if (side===1){ x=Math.random()*canvas.width; y=canvas.height; }
    else if (side===2){ x=0; y=Math.random()*canvas.height; }
    else { x=canvas.width; y=Math.random()*canvas.height; }

    enemies.push(new Enemy(x,y, speedFactor));
  }
  console.log(`Spawned wave ${waveIndex} (${count}) on difficulty ${difficulty}`);
}

/* -------------------------
   CONTROLE DO INÍCIO DO NÍVEL
   ------------------------- */
function startLevel(levelIndex, resetScore=true) {
  // limpa qualquer tela
  hide('menu'); hide('levelSelect'); hide('rankingScreen'); hide('gameOver'); hide('levelTransition');
  // mostra canvas
  document.getElementById('gameCanvas').classList.remove('hidden');

  // configura nível
  currentLevelIndex = levelIndex;
  difficulty = LEVELS[currentLevelIndex];
  if (resetScore) score = 0;

  // inicializa entidades
  player = new Player();
  bullets = [];
  enemies = [];
  currentWaveIndex = 0;

  // spawn primeira wave e iniciar loop
  spawnWave(currentWaveIndex);
  isGameRunning = true;
  cancelAnimationFrame(animationId); // garante cancelar anterior
  animationId = requestAnimationFrame(gameLoop);

  // tocar música após interação (browser policy)
  try { bgMusic.volume = 0.45; bgMusic.play().catch(()=>{}); } catch(e){/* ignore */ }
}

/* -------------------------
   AVANÇAR DE NÍVEL (TRANSIÇÃO)
   ------------------------- */
function onLevelComplete(){
  // se houver próximo nível
  if (currentLevelIndex < LEVELS.length - 1) {
    // pausa jogo e mostra tela
    isGameRunning = false;
    cancelAnimationFrame(animationId);
    document.getElementById('gameCanvas').classList.add('hidden');

    let nextIndex = currentLevelIndex + 1;
    let nextName = LEVELS[nextIndex] === 'medium' ? 'Médio' : 'Difícil';
    transitionMessageEl.textContent = `Avançando para o nível ${nextName}`;
    let countdown = 5;
    transitionCountdownEl.textContent = countdown;
    levelTransitionEl.classList.remove('hidden');

    let t = setInterval(()=>{
      countdown--;
      transitionCountdownEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(t);
        levelTransitionEl.classList.add('hidden');
        // inicia próximo nível, sem resetar pontuação
        startLevel(nextIndex, false);
      }
    }, 1000);

  } else {
    // se já estava no último nível -> fim de jogo
    endGame();
  }
}

/* -------------------------
   LOOP DO JOGO
   ------------------------- */
function gameLoop(){
  // guarda ID do frame
  animationId = requestAnimationFrame(gameLoop);

  // clear
  ctx.clearRect(0,0,canvas.width, canvas.height);

  // update & draw player
  if (!player) return;
  player.update();
  player.draw();

  // atualizar e desenhar tiros
  for (let i = bullets.length-1; i>=0; i--) {
    let b = bullets[i];
    b.update();
    b.draw();
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i,1);
  }

  // atualizar inimigos
  for (let ei = enemies.length-1; ei>=0; ei--) {
    let e = enemies[ei];
    e.update();
    e.draw();

    // colisão jogador x inimigo
    let dx = e.x - player.x;
    let dy = e.y - player.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < e.size + player.size*0.6) {
      // colidiu
      player.lives -= 1;
      try { playerExplosionSound.currentTime = 0; playerExplosionSound.play(); } catch(e){}
      enemies.splice(ei,1);
      if (player.lives <= 0) {
        // fim imediato do nível/jogo
        endGame();
        return;
      }
      continue;
    }

    // colisão tiro x inimigo
    for (let bi = bullets.length-1; bi>=0; bi--) {
      let b = bullets[bi];
      let dx2 = e.x - b.x;
      let dy2 = e.y - b.y;
      let d2 = Math.sqrt(dx2*dx2 + dy2*dy2);
      if (d2 < e.size) {
        // matar inimigo
        enemies.splice(ei,1);
        bullets.splice(bi,1);
        score += 100;
        try { explosionSound.currentTime = 0; explosionSound.play(); } catch(e){}
        break;
      }
    }
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Pontuação: ${score}`, 12, 20);
  ctx.fillText(`Vidas: ${player.lives}`, 12, 42);
  ctx.fillText(`Nível: ${LEVELS[currentLevelIndex].toUpperCase()}  Onda: ${currentWaveIndex+1}/${WAVES.length}`, 12, 64);

  // check waves/enemies
  if (enemies.length === 0) {
    // se ainda há waves -> spawn próxima
    if (currentWaveIndex < WAVES.length - 1) {
      currentWaveIndex++;
      spawnWave(currentWaveIndex);
    } else {
      // completou todas as waves do nível
      onLevelComplete();
    }
  }
}

/* -------------------------
   FINAL DO JOGO - SALVAR
   ------------------------- */
function endGame() {
  isGameRunning = false;
  cancelAnimationFrame(animationId);
  document.getElementById('gameCanvas').classList.add('hidden');
  finalScoreEl.textContent = `Sua pontuação: ${score}`;
  show('gameOver');
}

function saveScoreToLocalStorage(name){
  let ranking = JSON.parse(localStorage.getItem('ranking') || '[]');
  ranking.push({ name: name, score: score });
  ranking.sort((a,b)=> b.score - a.score);
  localStorage.setItem('ranking', JSON.stringify(ranking));
}

/* -------------------------
   RANKING UI
   ------------------------- */
function showRanking(){
  hide('menu'); hide('levelSelect'); hide('gameOver'); hide('levelTransition');
  document.getElementById('gameCanvas').classList.add('hidden');
  populateRanking();
  show('rankingScreen');
}
function populateRanking(){
  rankingListEl.innerHTML = '';
  let ranking = JSON.parse(localStorage.getItem('ranking') || '[]');
  if (ranking.length === 0) {
    rankingListEl.innerHTML = '<li>(vazio)</li>';
    return;
  }
  ranking.forEach(r => {
    let li = document.createElement('li');
    li.textContent = `${r.name}: ${r.score}`;
    rankingListEl.appendChild(li);
  });
}

/* -------------------------
   SHOOT helper
   ------------------------- */
function shoot(){
  let now = Date.now();
  if (now - lastShotAt < shotCooldown) return;
  lastShotAt = now;
  let a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  bullets.push(new Bullet(player.x, player.y, a));
  try { shootSound.currentTime = 0; shootSound.play(); } catch(e){}
}

/* -------------------------
   EVENTOS & CONTROLES
   ------------------------- */
// mouse / click
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener('click', ()=> {
  if (!isGameRunning) return;
  shoot();
});

// teclas
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.code === 'arrowup') keys.w = true;
  if (k === 'a' || e.code === 'arrowleft') keys.a = true;
  if (k === 's' || e.code === 'arrowdown') keys.s = true;
  if (k === 'd' || e.code === 'arrowright') keys.d = true;
  if (e.code === 'space') {
    if (isGameRunning) shoot();
    e.preventDefault();
  }
});
document.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.code === 'arrowup') keys.w = false;
  if (k === 'a' || e.code === 'arrowleft') keys.a = false;
  if (k === 's' || e.code === 'arrowdown') keys.s = false;
  if (k === 'd' || e.code === 'arrowright') keys.d = false;
});

/* -------------------------
   BOTÕES UI
   ------------------------- */
btnPlay.addEventListener('click', ()=> {
  hide('menu');
  show('levelSelect');
});

btnBackToMenu.addEventListener('click', ()=> {
  show('menu');
  hide('levelSelect');
});

btnEasy.addEventListener('click', ()=> startLevel(0, true));
btnMedium.addEventListener('click', ()=> startLevel(1, true));
btnHard.addEventListener('click', ()=> startLevel(2, true));

btnRanking.addEventListener('click', showRanking);
btnVoltar.addEventListener('click', ()=> {
  hide('rankingScreen');
  show('menu');
});
btnResetRanking.addEventListener('click', ()=> {
  localStorage.removeItem('ranking');
  populateRanking();
});

/* salvar pontuação (campo obrigatório) */
saveScoreBtn.addEventListener('click', ()=> {
  const name = playerNameInput.value.trim();
  if (!name) {
    alert('Digite um nome antes de salvar!');
    return;
  }
  saveScoreToLocalStorage(name);
  playerNameInput.value = '';
  hide('gameOver');
  show('menu');
});

/* -------------------------
   DEBUG & fallback (não iniciar automaticamente)
   ------------------------- */
console.log('Script carregado. Abra o menu e selecione o nível para iniciar o jogo.');
