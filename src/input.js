import { DAS_DELAY, DAS_REPEAT } from './constants.js';

export class Input {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.dasTimer = {};
    this.dasActive = {};
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchMoved = false;

    // Callbacks for UI
    this.onPause = null;

    this._setupKeyboard();
    this._setupTouch();
  }

  _setupKeyboard() {
    const keyActions = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'softDrop',
      ArrowUp: 'rotateCW',
      KeyZ: 'rotateCCW',
      KeyX: 'rotateCW',
      Space: 'hardDrop',
      KeyC: 'hold',
      ShiftLeft: 'hold',
      Escape: 'pause',
      KeyP: 'pause',
    };

    window.addEventListener('keydown', (e) => {
      const action = keyActions[e.code];
      if (!action) return;
      e.preventDefault();

      if (action === 'pause') {
        if (this.onPause) this.onPause();
        return;
      }

      if (this.keys[action]) return; // Already held
      this.keys[action] = true;
      this.dasTimer[action] = 0;
      this.dasActive[action] = false;
      this._executeAction(action);
    });

    window.addEventListener('keyup', (e) => {
      const action = keyActions[e.code];
      if (!action) return;
      e.preventDefault();
      this.keys[action] = false;
      this.dasTimer[action] = 0;
      this.dasActive[action] = false;
    });
  }

  _executeAction(action) {
    switch (action) {
      case 'left': this.game.moveLeft(); break;
      case 'right': this.game.moveRight(); break;
      case 'softDrop': this.game.softDrop(); break;
      case 'hardDrop': this.game.hardDrop(); break;
      case 'rotateCW': this.game.rotate(1); break;
      case 'rotateCCW': this.game.rotate(-1); break;
      case 'hold': this.game.hold(); break;
    }
  }

  update(dt) {
    // DAS (Delayed Auto Shift) for held keys
    for (const action of ['left', 'right', 'softDrop']) {
      if (this.keys[action]) {
        this.dasTimer[action] += dt;
        if (!this.dasActive[action]) {
          if (this.dasTimer[action] >= DAS_DELAY) {
            this.dasActive[action] = true;
            this.dasTimer[action] = 0;
            this._executeAction(action);
          }
        } else {
          if (this.dasTimer[action] >= DAS_REPEAT) {
            this.dasTimer[action] = 0;
            this._executeAction(action);
          }
        }
      }
    }
  }

  _setupTouch() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    let swipeThreshold = 30;
    let tapThreshold = 10;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();
      this.touchMoved = false;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - this.touchStartX;
      const dy = touch.clientY - this.touchStartY;

      if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
        this.touchMoved = true;
        if (dx > 0) this.game.moveRight();
        else this.game.moveLeft();
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      } else if (dy > swipeThreshold && Math.abs(dy) > Math.abs(dx)) {
        this.touchMoved = true;
        this.game.softDrop();
        this.touchStartY = touch.clientY;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const dt = Date.now() - this.touchStartTime;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.touchStartX;
      const dy = touch.clientY - this.touchStartY;

      if (!this.touchMoved && Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold && dt < 300) {
        // Tap = rotate
        this.game.rotate(1);
      } else if (dy > 80 && dt < 200 && Math.abs(dy) > Math.abs(dx) * 2) {
        // Fast flick down = hard drop
        this.game.hardDrop();
      }
    }, { passive: false });

    // Swipe up from bottom for hold (two-finger tap)
    canvas.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.game.hold();
      }
    }, { passive: false });
  }

  destroy() {
    // Cleanup if needed
  }
}
