// Leaderboard stored in localStorage
const STORAGE_KEY = 'tetris_leaderboard';
const MAX_ENTRIES = 10;

export function getLeaderboard() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addScore(name, score, level, lines) {
  const lb = getLeaderboard();
  lb.push({ name: name || 'Anonymous', score, level, lines, date: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  if (lb.length > MAX_ENTRIES) lb.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lb));
  return lb;
}

export function isHighScore(score) {
  const lb = getLeaderboard();
  if (lb.length < MAX_ENTRIES) return true;
  return score > lb[lb.length - 1].score;
}
