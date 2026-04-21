import { COLS, ROWS, HIDDEN_ROWS, TETROMINOES, THEMES } from './constants.js';

export class Renderer {
  constructor(gameCanvas, nextCanvas, holdCanvas) {
    this.gameCanvas = gameCanvas;
    this.ctx = gameCanvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nctx = nextCanvas.getContext('2d');
    this.holdCanvas = holdCanvas;
    this.hctx = holdCanvas.getContext('2d');

    this.theme = THEMES.modern;
    this.themeName = 'modern';
    this.cellSize = 30;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeTimer = 0;

    // Line clear flash
    this.flashRows = [];
    this.flashTimer = 0;

    // Particles
    this.particles = [];

    // Lock/merge animation: cells that just locked glow then fade
    this.mergeFlashes = []; // { x, y, color, timer, maxTimer }

    // Ripple effects on lock
    this.ripples = []; // { cx, cy, radius, maxRadius, life, maxLife, color }

    // Ambient floating orbs (dynamic background)
    this.orbs = [];
    this._initOrbs();

    // Global time for ambient animations
    this.globalTime = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  setTheme(name) {
    this.themeName = name;
    this.theme = THEMES[name] || THEMES.modern;
    document.documentElement.style.setProperty('--bg-color', this.theme.bg);
    document.documentElement.style.setProperty('--ui-bg', this.theme.uiBg);
    document.documentElement.style.setProperty('--ui-border', this.theme.uiBorder);
    document.documentElement.style.setProperty('--text-color', this.theme.text);
    document.documentElement.style.setProperty('--font-family', this.theme.font);
  }

  _resize() {
    const maxH = window.innerHeight * 0.8;
    const maxW = window.innerWidth * 0.4;
    this.cellSize = Math.floor(Math.min(maxH / ROWS, maxW / COLS, 36));
    this.cellSize = Math.max(this.cellSize, 18);

    this.gameCanvas.width = COLS * this.cellSize;
    this.gameCanvas.height = ROWS * this.cellSize;

    // Next & hold canvases
    const previewCell = Math.floor(this.cellSize * 0.7);
    this.previewCell = previewCell;
    this.nextCanvas.width = previewCell * 5;
    this.nextCanvas.height = previewCell * 3 * 3 + previewCell;
    this.holdCanvas.width = previewCell * 5;
    this.holdCanvas.height = previewCell * 3;
  }

  // Initialize ambient floating orbs
  _initOrbs() {
    this.orbs = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      this.orbs.push(this._createOrb());
    }
  }

  _createOrb() {
    const colorKeys = ['cyan', 'yellow', 'purple', 'green', 'red', 'orange', 'blue'];
    return {
      x: Math.random() * (COLS * 40),
      y: Math.random() * (ROWS * 40),
      baseX: Math.random() * (COLS * 40),
      baseY: Math.random() * (ROWS * 40),
      radius: 3 + Math.random() * 8,
      driftRadius: 30 + Math.random() * 60,
      speed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      colorKey: colorKeys[Math.floor(Math.random() * colorKeys.length)],
      alpha: 0.08 + Math.random() * 0.15,
      pulseSpeed: 0.5 + Math.random() * 1.5,
    };
  }

  triggerShake(intensity = 4) {
    this.shakeTimer = 150;
    this.shakeIntensity = intensity;
  }

  triggerFlash(rows) {
    this.flashRows = rows.map(r => r - HIDDEN_ROWS);
    this.flashTimer = 300;
  }

  // Trigger merge flash on the cells where a piece just locked
  triggerMergeFlash(cells, color) {
    const dur = 500;
    for (const { x, y } of cells) {
      this.mergeFlashes.push({
        x, y: y - HIDDEN_ROWS, color, timer: dur, maxTimer: dur,
      });
    }
    // Spawn a ripple from the center of the locked piece
    if (cells.length > 0) {
      let cx = 0, cy = 0;
      for (const c of cells) { cx += c.x; cy += c.y - HIDDEN_ROWS; }
      cx = (cx / cells.length + 0.5) * this.cellSize;
      cy = (cy / cells.length + 0.5) * this.cellSize;
      this.ripples.push({
        cx, cy,
        radius: 0,
        maxRadius: this.cellSize * 4,
        life: 600,
        maxLife: 600,
        color: this.theme.colors[color] || '#ffffff',
      });
    }
  }

  spawnParticles(row, count = 20) {
    const vy = row - HIDDEN_ROWS;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.gameCanvas.width,
        y: vy * this.cellSize + this.cellSize / 2,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 4 - 2,
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        size: 2 + Math.random() * 3,
        color: this.theme.colors[['cyan', 'yellow', 'purple', 'green', 'red', 'orange'][Math.floor(Math.random() * 6)]],
      });
    }
  }

  // Spawn small sparkles from each merge cell
  spawnMergeSparks(cells, color) {
    const c = this.theme.colors[color] || '#ffffff';
    for (const cell of cells) {
      const px = (cell.x + 0.5) * this.cellSize;
      const py = (cell.y - HIDDEN_ROWS + 0.5) * this.cellSize;
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        this.particles.push({
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 300 + Math.random() * 300,
          maxLife: 600,
          size: 1.5 + Math.random() * 2.5,
          color: c,
        });
      }
    }
  }

  updateEffects(dt) {
    this.globalTime += dt;

    // Shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Flash
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flashRows = [];
    }

    // Merge flashes
    for (let i = this.mergeFlashes.length - 1; i >= 0; i--) {
      this.mergeFlashes[i].timer -= dt;
      if (this.mergeFlashes[i].timer <= 0) this.mergeFlashes.splice(i, 1);
    }

    // Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life -= dt;
      const progress = 1 - r.life / r.maxLife;
      r.radius = r.maxRadius * progress;
      if (r.life <= 0) this.ripples.splice(i, 1);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Ambient orbs drift
    const t = this.globalTime / 1000;
    const w = this.gameCanvas.width;
    const h = this.gameCanvas.height;
    for (const orb of this.orbs) {
      orb.x = orb.baseX + Math.sin(t * orb.speed + orb.phase) * orb.driftRadius;
      orb.y = orb.baseY + Math.cos(t * orb.speed * 0.7 + orb.phase) * orb.driftRadius;
      // Wrap around
      if (orb.baseX > w + 50) orb.baseX -= w + 100;
      if (orb.baseX < -50) orb.baseX += w + 100;
      if (orb.baseY > h + 50) orb.baseY -= h + 100;
      if (orb.baseY < -50) orb.baseY += h + 100;
    }
  }

  render(game) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const board = game.getBoard();
    const piece = game.getCurrentPiece();

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Clear
    ctx.fillStyle = this.theme.boardBg;
    ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

    // --- Ambient floating orbs (behind everything) ---
    const t = this.globalTime / 1000;
    for (const orb of this.orbs) {
      const color = this.theme.colors[orb.colorKey] || '#ffffff';
      const pulse = 0.5 + 0.5 * Math.sin(t * orb.pulseSpeed + orb.phase);
      const alpha = orb.alpha * (0.6 + pulse * 0.4);
      const r = orb.radius * (0.8 + pulse * 0.4);
      const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r * 3);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Grid lines
    ctx.strokeStyle = this.theme.gridLine;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cs, 0);
      ctx.lineTo(x * cs, ROWS * cs);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cs);
      ctx.lineTo(COLS * cs, y * cs);
      ctx.stroke();
    }

    // Board cells
    for (let y = HIDDEN_ROWS; y < ROWS + HIDDEN_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x]) {
          this._drawBlock(ctx, x, y - HIDDEN_ROWS, board[y][x], cs);
        }
      }
    }

    // --- Merge flash overlay on recently locked cells ---
    for (const mf of this.mergeFlashes) {
      const progress = mf.timer / mf.maxTimer; // 1 -> 0
      const color = this.theme.colors[mf.color] || '#ffffff';
      // White flash that fades, plus a scale-down glow
      const expand = (1 - progress) * 4; // grows outward slightly
      ctx.globalAlpha = progress * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        mf.x * cs + 1 - expand,
        mf.y * cs + 1 - expand,
        cs - 2 + expand * 2,
        cs - 2 + expand * 2
      );
      // Color glow ring
      ctx.globalAlpha = progress * 0.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 + (1 - progress) * 3;
      ctx.strokeRect(
        mf.x * cs - expand,
        mf.y * cs - expand,
        cs + expand * 2,
        cs + expand * 2
      );
    }
    ctx.globalAlpha = 1;

    // --- Ripple rings ---
    for (const rip of this.ripples) {
      const alpha = (rip.life / rip.maxLife) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = rip.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rip.cx, rip.cy, rip.radius, 0, Math.PI * 2);
      ctx.stroke();
      // Second thinner ring trailing behind
      if (rip.radius > 10) {
        ctx.globalAlpha = alpha * 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rip.cx, rip.cy, rip.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Ghost piece
    if (piece && !game.gameOver) {
      const ghostY = game.getGhostY();
      this._drawPiece(ctx, piece.shape, piece.x, ghostY - HIDDEN_ROWS, piece.color, cs, true);
    }

    // Current piece
    if (piece && !game.gameOver) {
      this._drawPiece(ctx, piece.shape, piece.x, piece.y - HIDDEN_ROWS, piece.color, cs, false);
    }

    // Flash effect (line clears)
    if (this.flashRows.length > 0 && this.flashTimer > 0) {
      const alpha = (this.flashTimer / 300) * 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      for (const row of this.flashRows) {
        ctx.fillRect(0, row * cs, COLS * cs, cs);
      }
    }

    // Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      // Draw as small glowing circle
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.restore();

    // Render next queue
    this._renderNextQueue(game.getNextQueue());

    // Render hold
    this._renderHold(game.getHoldPiece());
  }

  _drawBlock(ctx, x, y, colorName, cs, ghost = false) {
    const color = this.theme.colors[colorName] || colorName;
    const padding = 1;

    if (ghost) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(x * cs + padding, y * cs + padding, cs - padding * 2, cs - padding * 2);
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = color;

    if (this.theme.blockStyle === 'glow') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillRect(x * cs + padding, y * cs + padding, cs - padding * 2, cs - padding * 2);
      ctx.shadowBlur = 0;
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x * cs + padding, y * cs + padding, cs - padding * 2, (cs - padding * 2) * 0.3);
    } else if (this.theme.blockStyle === 'flat') {
      ctx.fillRect(x * cs + padding, y * cs + padding, cs - padding * 2, cs - padding * 2);
      // Pixel border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * cs + padding + 1, y * cs + padding + 1, cs - padding * 2 - 2, cs - padding * 2 - 2);
    } else {
      // Matte
      ctx.fillRect(x * cs + padding, y * cs + padding, cs - padding * 2, cs - padding * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x * cs + padding, y * cs + cs * 0.6, cs - padding * 2, cs * 0.4 - padding);
    }
  }

  _drawPiece(ctx, shape, px, py, color, cs, ghost) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this._drawBlock(ctx, px + x, py + y, color, cs, ghost);
        }
      }
    }
  }

  _renderNextQueue(queue) {
    const ctx = this.nctx;
    const cs = this.previewCell;
    ctx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

    queue.forEach((type, idx) => {
      const def = TETROMINOES[type];
      const shape = def.shape;
      const offsetY = idx * (cs * 3 + 4);
      const offsetX = (this.nextCanvas.width - shape[0].length * cs) / 2;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            this._drawPreviewBlock(ctx, offsetX + x * cs, offsetY + y * cs, def.color, cs);
          }
        }
      }
    });
  }

  _renderHold(type) {
    const ctx = this.hctx;
    const cs = this.previewCell;
    ctx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

    if (!type) return;
    const def = TETROMINOES[type];
    const shape = def.shape;
    const offsetX = (this.holdCanvas.width - shape[0].length * cs) / 2;
    const offsetY = (this.holdCanvas.height - shape.length * cs) / 2;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          this._drawPreviewBlock(ctx, offsetX + x * cs, offsetY + y * cs, def.color, cs);
        }
      }
    }
  }

  _drawPreviewBlock(ctx, x, y, colorName, cs) {
    const color = this.theme.colors[colorName] || colorName;
    ctx.fillStyle = color;
    if (this.theme.blockStyle === 'glow') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }
    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
    ctx.shadowBlur = 0;
  }
}
