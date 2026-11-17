// NEON TIDE — save and load through localStorage.
// Cash, mission progress and lifetime stats survive a reload.

const KEY = 'neon-tide-save-v1';

export function saveGame(G) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: G.player.cash,
      mission: G.mission.allDone ? 3 : G.mission.index,
      done: G.mission.allDone,
      stats: G.stats,
    }));
  } catch (e) {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}
