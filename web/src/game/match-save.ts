import type { Game } from '../engine';
import { snapshot } from '../engine/save';
import type { SavedGame } from '../engine/save';

/** Quiet window that coalesces bot-heavy turns into one write. */
export const MATCH_SAVE_DELAY_MS = 400;

export interface MatchAutosave {
  /** Called when a turn completes; coalesced into one write per quiet window. */
  schedule(game: Game): void;
  /** Writes a pending snapshot now (pause, hidden tab). */
  flush(): void;
  /** Forgets pending state; the caller owns clearing the stored match. */
  reset(): void;
}

/**
 * Debounced writer for the live match. A failed write is swallowed and retried
 * by the next turn, so storage trouble never reaches the player or the flow.
 */
export function createMatchAutosave(
  onSave: (snapshot: SavedGame) => Promise<void>,
  delayMs = MATCH_SAVE_DELAY_MS,
): MatchAutosave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: SavedGame | null = null;
  let pendingKey: string | null = null;
  let savedKey: string | null = null;
  let inFlightKey: string | null = null;

  const clearTimer = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const fire = (): void => {
    clearTimer();
    if (pending === null) return;
    const key = pendingKey;
    const snap = pending;
    pending = null;
    pendingKey = null;
    savedKey = key;
    inFlightKey = key;
    void Promise.resolve()
      .then(() => onSave(snap))
      .catch((error: unknown) => {
        savedKey = null;
        console.warn('[match] autosave failed', error);
      })
      .finally(() => {
        if (inFlightKey === key) inFlightKey = null;
      });
  };

  return {
    schedule(game) {
      if (game.gameOver) return;
      const snap = snapshot(game);
      const key = JSON.stringify(snap);
      // Re-layout and repeated settles hand us the same state; one write is enough.
      if (key === pendingKey || key === savedKey || key === inFlightKey) return;
      pending = snap;
      pendingKey = key;
      clearTimer();
      timer = setTimeout(fire, delayMs);
    },
    flush: fire,
    reset() {
      clearTimer();
      pending = null;
      pendingKey = null;
      savedKey = null;
      inFlightKey = null;
    },
  };
}
