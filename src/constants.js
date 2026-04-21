// Board dimensions
export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2; // rows above visible area

// Timing
export const LOCK_DELAY = 500; // ms before piece locks after landing
export const DAS_DELAY = 170; // Delayed Auto Shift initial delay
export const DAS_REPEAT = 50; // repeat rate

// Scoring (NES-style)
export const POINTS = {
  1: 100,
  2: 300,
  3: 500,
  4: 800, // Tetris!
  softDrop: 1,
  hardDrop: 2,
  combo: 50,
};

// Level speed curve (ms per gravity tick)
export function getDropInterval(level) {
  const speeds = [800,720,630,550,470,380,300,220,140,100,80,80,80,70,70,70,50,50,50,30];
  return speeds[Math.min(level - 1, speeds.length - 1)] || 20;
}

// Tetromino definitions (SRS)
export const TETROMINOES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 'cyan' },
  O: { shape: [[1,1],[1,1]], color: 'yellow' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: 'purple' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: 'green' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: 'red' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: 'blue' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: 'orange' },
};

export const PIECE_TYPES = Object.keys(TETROMINOES);

// SRS Wall Kick Data
export const WALL_KICKS = {
  normal: {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  },
  I: {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  },
};

// Theme color maps
export const THEMES = {
  retro: {
    bg: '#000000',
    boardBg: '#111111',
    gridLine: '#1a1a1a',
    text: '#ffffff',
    uiBg: '#1a1a1a',
    uiBorder: '#333333',
    colors: {
      cyan: '#00ffff', yellow: '#ffff00', purple: '#aa00ff',
      green: '#00ff00', red: '#ff0000', blue: '#0000ff', orange: '#ff8800',
    },
    blockStyle: 'flat', // flat pixel look
    font: '"Press Start 2P", monospace',
  },
  modern: {
    bg: '#0a0a2e',
    boardBg: '#0d0d3b',
    gridLine: '#1a1a4e',
    text: '#e0e0ff',
    uiBg: '#12124a',
    uiBorder: '#2a2a6e',
    colors: {
      cyan: '#00e5ff', yellow: '#ffea00', purple: '#d500f9',
      green: '#76ff03', red: '#ff1744', blue: '#2979ff', orange: '#ff9100',
    },
    blockStyle: 'glow',
    font: '"Orbitron", sans-serif',
  },
  dark: {
    bg: '#0d0d0d',
    boardBg: '#141414',
    gridLine: '#1e1e1e',
    text: '#b0b0b0',
    uiBg: '#1a1a1a',
    uiBorder: '#2e2e2e',
    colors: {
      cyan: '#4dd0e1', yellow: '#fff176', purple: '#ce93d8',
      green: '#a5d6a7', red: '#ef9a9a', blue: '#90caf9', orange: '#ffcc80',
    },
    blockStyle: 'matte',
    font: '"Rajdhani", sans-serif',
  },
};
