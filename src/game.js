import { COLS, ROWS, HIDDEN_ROWS, TETROMINOES, PIECE_TYPES, WALL_KICKS, LOCK_DELAY, POINTS, getDropInterval } from './constants.js';

// 7-bag randomizer
function createBag() {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function rotateMatrix(matrix, dir) {
  const n = matrix.length;
  const result = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (dir === 1) result[x][n - 1 - y] = matrix[y][x]; // CW
      else result[n - 1 - x][y] = matrix[y][x]; // CCW
    }
  }
  return result;
}

export class Game {
  constructor() {
    this.reset();
    this.onLineClear = null; // callback(clearedRows, isTetris, combo)
    this.onHardDrop = null;  // callback(rows)
    this.onGameOver = null;  // callback(score, level, lines)
    this.onPieceLock = null; // callback(lockedCells, color)
    this.onMove = null;      // callback()
    this.onRotate = null;    // callback()
    this.onHold = null;      // callback()
    this.onLevelUp = null;   // callback(level)
  }

  reset() {
    this.board = Array.from({ length: ROWS + HIDDEN_ROWS }, () => Array(COLS).fill(null));
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.bag = [];
    this.nextQueue = [];
    this.holdPiece = null;
    this.holdUsed = false;
    this.current = null;
    this.gameOver = false;
    this.paused = false;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.locking = false;
    this.lockMoves = 0;

    // Fill next queue
    for (let i = 0; i < 5; i++) this._fillQueue();
    this._spawnPiece();
  }

  _fillQueue() {
    if (this.bag.length === 0) this.bag = createBag();
    this.nextQueue.push(this.bag.pop());
  }

  _spawnPiece() {
    const type = this.nextQueue.shift();
    this._fillQueue();
    const def = TETROMINOES[type];
    const shape = def.shape.map(r => [...r]);
    const x = Math.floor((COLS - shape[0].length) / 2);
    const y = 0; // spawn at top of hidden area

    this.current = { type, shape, color: def.color, x, y, rotation: 0 };
    this.locking = false;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.holdUsed = false;

    if (!this._isValid(shape, x, y)) {
      this.gameOver = true;
      if (this.onGameOver) this.onGameOver(this.score, this.level, this.lines);
    }
  }

  _isValid(shape, px, py) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const bx = px + x;
        const by = py + y;
        if (bx < 0 || bx >= COLS || by >= ROWS + HIDDEN_ROWS) return false;
        if (by >= 0 && this.board[by][bx]) return false;
      }
    }
    return true;
  }

  // Get ghost piece Y position
  getGhostY() {
    if (!this.current) return 0;
    let gy = this.current.y;
    while (this._isValid(this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  moveLeft() {
    if (!this.current || this.gameOver || this.paused) return false;
    if (this._isValid(this.current.shape, this.current.x - 1, this.current.y)) {
      this.current.x--;
      this._resetLockIfNeeded();
      if (this.onMove) this.onMove();
      return true;
    }
    return false;
  }

  moveRight() {
    if (!this.current || this.gameOver || this.paused) return false;
    if (this._isValid(this.current.shape, this.current.x + 1, this.current.y)) {
      this.current.x++;
      this._resetLockIfNeeded();
      if (this.onMove) this.onMove();
      return true;
    }
    return false;
  }

  softDrop() {
    if (!this.current || this.gameOver || this.paused) return false;
    if (this._isValid(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += POINTS.softDrop * this.level;
      this.dropTimer = 0;
      if (this.onMove) this.onMove();
      return true;
    }
    return false;
  }

  hardDrop() {
    if (!this.current || this.gameOver || this.paused) return false;
    let rows = 0;
    while (this._isValid(this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      rows++;
    }
    this.score += POINTS.hardDrop * rows * this.level;
    if (this.onHardDrop) this.onHardDrop(rows);
    this._lockPiece();
    return true;
  }

  rotate(dir = 1) {
    if (!this.current || this.gameOver || this.paused) return false;
    if (this.current.type === 'O') return false;
    const newShape = rotateMatrix(this.current.shape, dir);
    const oldRot = this.current.rotation;
    const newRot = (oldRot + (dir === 1 ? 1 : 3)) % 4;
    const kickKey = `${oldRot}>${newRot}`;
    const kickTable = this.current.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal;
    const kicks = kickTable[kickKey] || [[0, 0]];

    for (const [kx, ky] of kicks) {
      if (this._isValid(newShape, this.current.x + kx, this.current.y - ky)) {
        this.current.shape = newShape;
        this.current.x += kx;
        this.current.y -= ky;
        this.current.rotation = newRot;
        this._resetLockIfNeeded();
        if (this.onRotate) this.onRotate();
        return true;
      }
    }
    return false;
  }

  hold() {
    if (!this.current || this.holdUsed || this.gameOver || this.paused) return false;
    const type = this.current.type;
    if (this.holdPiece) {
      const held = this.holdPiece;
      this.holdPiece = type;
      // Spawn the held piece
      const def = TETROMINOES[held];
      const shape = def.shape.map(r => [...r]);
      const x = Math.floor((COLS - shape[0].length) / 2);
      this.current = { type: held, shape, color: def.color, x, y: 0, rotation: 0 };
      this.locking = false;
      this.lockTimer = 0;
      this.lockMoves = 0;
    } else {
      this.holdPiece = type;
      this._spawnPiece();
    }
    this.holdUsed = true;
    if (this.onHold) this.onHold();
    return true;
  }

  _resetLockIfNeeded() {
    if (this.locking && this.lockMoves < 15) {
      this.lockTimer = 0;
      this.lockMoves++;
    }
  }

  _lockPiece() {
    const { shape, x: px, y: py, color } = this.current;
    const lockedCells = [];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const by = py + y;
        const bx = px + x;
        if (by >= 0 && by < ROWS + HIDDEN_ROWS && bx >= 0 && bx < COLS) {
          this.board[by][bx] = color;
          lockedCells.push({ x: bx, y: by });
        }
      }
    }
    if (this.onPieceLock) this.onPieceLock(lockedCells, color);
    this._clearLines();
    this._spawnPiece();
  }

  _clearLines() {
    const cleared = [];
    for (let y = ROWS + HIDDEN_ROWS - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== null)) {
        cleared.push(y);
      }
    }
    if (cleared.length > 0) {
      this.combo++;
      // Remove cleared rows
      for (const row of cleared) {
        this.board.splice(row, 1);
        this.board.unshift(Array(COLS).fill(null));
      }
      // Scoring
      const basePoints = POINTS[cleared.length] || 0;
      this.score += basePoints * this.level + POINTS.combo * this.combo * this.level;
      this.lines += cleared.length;

      // Level up every 10 lines
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        if (this.onLevelUp) this.onLevelUp(this.level);
      }

      const isTetris = cleared.length === 4;
      if (this.onLineClear) this.onLineClear(cleared, isTetris, this.combo);
    } else {
      this.combo = -1;
    }
  }

  update(dt) {
    if (!this.current || this.gameOver || this.paused) return;

    // Check if piece is grounded
    const grounded = !this._isValid(this.current.shape, this.current.x, this.current.y + 1);

    if (grounded) {
      if (!this.locking) {
        this.locking = true;
        this.lockTimer = 0;
      }
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) {
        this._lockPiece();
      }
    } else {
      this.locking = false;
      this.lockTimer = 0;

      // Gravity
      this.dropTimer += dt;
      const interval = getDropInterval(this.level);
      if (this.dropTimer >= interval) {
        this.current.y++;
        this.dropTimer = 0;
      }
    }
  }

  // Get board state for rendering (excluding current piece)
  getBoard() {
    return this.board;
  }

  getCurrentPiece() {
    return this.current;
  }

  getNextQueue() {
    return this.nextQueue.slice(0, 3);
  }

  getHoldPiece() {
    return this.holdPiece;
  }
}
