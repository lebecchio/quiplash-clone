import { STATE_VERSION, type GameState } from '../game/types';

const KEY = 'qlc-host-state';
/** sessionStorage survives a reload but not closing the tab: that tells the two apart. */
const SESSION_KEY = 'qlc-host-session';

export function saveState(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the game still runs, it just can't survive a reload */
  }
}

/**
 * Returns the saved game if this tab is being reloaded and the state version still
 * matches. Anything else is thrown away: a closed tab ends the room.
 */
export function loadState(): GameState | null {
  try {
    const reloaded = sessionStorage.getItem(SESSION_KEY) !== null;
    sessionStorage.setItem(SESSION_KEY, '1');
    const raw = localStorage.getItem(KEY);
    if (!reloaded || !raw) {
      localStorage.removeItem(KEY);
      return null;
    }
    const s = JSON.parse(raw) as GameState;
    if (s.version !== STATE_VERSION) {
      localStorage.removeItem(KEY);
      return null;
    }
    // Nobody is connected after a reload; phones rejoin with their tokens.
    for (const p of s.players) p.connected = false;
    if (s.phase !== 'lobby' && s.phase !== 'gameOver') s.pausedAt = s.pausedAt ?? Date.now();
    return s;
  } catch {
    return null;
  }
}
