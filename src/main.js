import './style.css';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { Audio as GameAudio } from './audio.js';
import { Input } from './input.js';
import { getLeaderboard, addScore } from './leaderboard.js';

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');

const btnPlay = document.getElementById('btn-play');
const btnLeaderboard = document.getElementById('btn-leaderboard');
const btnBack = document.getElementById('btn-back');
const btnPause = document.getElementById('btn-pause');
const btnMute = document.getElementById('btn-mute');
const btnResume = document.getElementById('btn-resume');
const btnQuit = document.getElementById('btn-quit');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSaveScore = document.getElementById('btn-save-score');
const themeSelector = document.getElementById('theme-selector');

const scoreEl = document.getElementById('score-value');
const levelEl = document.getElementById('level-value');
const linesEl = document.getElementById('lines-value');
const finalScoreEl = document.getElementById('final-score');
const playerNameEl = document.getElementById('player-name');
const pauseOverlay = document.getElementById('pause-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const comboPopup = document.getElementById('combo-popup');
const lbEntries = document.getElementById('lb-entries');

const gameCanvas = document.getElementById('game-canvas');
const nextCanvas = document.getElementById('next-canvas');
const holdCanvas = document.getElementById('hold-canvas');

// Core systems
let game, renderer, audio, input;
let animFrameId = null;
let lastTime = 0;
let muted = false;
let currentTheme = 'modern';

// --- Screen management ---
function showScreen(screen) {
  [startScreen, gameScreen, leaderboardScreen].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// --- Leaderboard rendering ---
function renderLeaderboard() {
  const lb = getLeaderboard();
  lbEntries.innerHTML = '';
  if (lb.length === 0) {
    lbEntries.innerHTML = '<div class="lb-empty">No scores yet</div>';
    return;
  }
  lb.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `<span>${i + 1}</span><span>${entry.name}</span><span>${entry.score.toLocaleString()}</span><span>${entry.level}</span>`;
    lbEntries.appendChild(row);
  });
}

// --- Combo popup ---
let comboTimeout = null;
function showCombo(text) {
  comboPopup.textContent = text;
  comboPopup.classList.remove('hidden');
  comboPopup.classList.add('pop');
  clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => {
    comboPopup.classList.add('hidden');
    comboPopup.classList.remove('pop');
  }, 1200);
}

// --- Start game ---
function startGame() {
  game = new Game();
  renderer = new Renderer(gameCanvas, nextCanvas, holdCanvas);
  audio = new GameAudio();
  input = new Input(game);

  renderer.setTheme(currentTheme);

  // Wire up game callbacks
  game.onLineClear = (rows, isTetris, combo) => {
    renderer.triggerFlash(rows);
    if (isTetris) {
      rows.forEach(r => renderer.spawnParticles(r, 30));
      renderer.triggerShake(6);
      audio.playTetris();
      showCombo('TETRIS!');
    } else {
      rows.forEach(r => renderer.spawnParticles(r, 10));
      renderer.triggerShake(3);
      audio.playLineClear(combo);
      if (combo > 0) {
        showCombo(`${rows.length} Line${rows.length > 1 ? 's' : ''} x${combo + 1} COMBO!`);
      } else {
        const labels = { 1: 'SINGLE!', 2: 'DOUBLE!', 3: 'TRIPLE!' };
        showCombo(labels[rows.length] || `${rows.length} LINES!`);
      }
    }
  };

  game.onHardDrop = (rows) => {
    renderer.triggerShake(4);
    audio.playDrop();
  };

  game.onPieceLock = (lockedCells, color) => {
    audio.playLock();
    renderer.triggerMergeFlash(lockedCells, color);
    renderer.spawnMergeSparks(lockedCells, color);
    renderer.triggerShake(1.5);
  };

  game.onMove = () => {
    audio.playMove();
  };

  game.onRotate = () => {
    audio.playRotate();
  };

  game.onHold = () => {
    audio.playHold();
  };

  game.onLevelUp = (level) => {
    audio.playLevelUp();
    audio.setTempo(level);
    showCombo(`LEVEL ${level}!`);
  };

  game.onGameOver = (score, level, lines) => {
    audio.stopBGM();
    audio.playGameOver();
    gameoverOverlay.classList.remove('hidden');
    finalScoreEl.textContent = score.toLocaleString();
    playerNameEl.value = '';
    playerNameEl.focus();
  };

  input.onPause = () => togglePause();

  showScreen(gameScreen);
  pauseOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');

  audio.startBGM();
  audio.setMuted(muted);

  lastTime = performance.now();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  gameLoop(lastTime);
}

function togglePause() {
  if (game.gameOver) return;
  game.paused = !game.paused;
  if (game.paused) {
    pauseOverlay.classList.remove('hidden');
    audio.stopBGM();
  } else {
    pauseOverlay.classList.add('hidden');
    audio.startBGM();
    lastTime = performance.now();
  }
}

function stopGame() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  if (audio) audio.stopBGM();
}

// --- Game Loop ---
function gameLoop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 100); // cap at 100ms
  lastTime = timestamp;

  if (!game.paused && !game.gameOver) {
    input.update(dt);
    game.update(dt);
  }

  renderer.updateEffects(dt);
  renderer.render(game);

  // Update UI
  scoreEl.textContent = game.score.toLocaleString();
  levelEl.textContent = game.level;
  linesEl.textContent = game.lines;

  animFrameId = requestAnimationFrame(gameLoop);
}

// --- Event listeners ---
btnPlay.addEventListener('click', () => startGame());

btnLeaderboard.addEventListener('click', () => {
  renderLeaderboard();
  showScreen(leaderboardScreen);
});

btnBack.addEventListener('click', () => showScreen(startScreen));

btnPause.addEventListener('click', () => togglePause());

btnMute.addEventListener('click', () => {
  muted = !muted;
  btnMute.textContent = muted ? '🔇' : '🔊';
  if (audio) audio.setMuted(muted);
});

btnResume.addEventListener('click', () => togglePause());

btnQuit.addEventListener('click', () => {
  stopGame();
  showScreen(startScreen);
});

btnRestart.addEventListener('click', () => {
  stopGame();
  startGame();
});

btnMenu.addEventListener('click', () => {
  stopGame();
  showScreen(startScreen);
});

btnSaveScore.addEventListener('click', () => {
  if (game) {
    const name = playerNameEl.value.trim() || 'Anonymous';
    addScore(name, game.score, game.level, game.lines);
    btnSaveScore.disabled = true;
    btnSaveScore.textContent = 'SAVED!';
  }
});

themeSelector.addEventListener('change', (e) => {
  currentTheme = e.target.value;
  if (renderer) renderer.setTheme(currentTheme);
  // Apply theme to start screen too
  const tempTheme = { modern: 'modern', retro: 'retro', dark: 'dark' }[currentTheme];
  document.body.setAttribute('data-theme', tempTheme);
});

// Initialize theme on load
document.body.setAttribute('data-theme', 'modern');
