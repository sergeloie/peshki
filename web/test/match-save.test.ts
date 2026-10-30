import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game, seededRandom } from '../src/engine';
import { snapshot, toJson } from '../src/engine/save';
import { fromSave } from '../src/engine/save';
import type { SavedGame } from '../src/engine/save';
import {
  DEFAULT_PROGRESS,
  MATCH_VERSION,
  parseProgress,
  recordCompletedGame,
  withMatch,
  withoutMatch,
} from '../src/game/progress';
import type { GameProgress } from '../src/game/progress';
import { MATCH_SAVE_DELAY_MS, createMatchAutosave } from '../src/game/match-save';
import { createFakePlatform } from './fake-platform';

function newGame(seed = 7): Game {
  return new Game({ random: seededRandom(seed) });
}

/** Same wiring as main: the writer updates the blob, the platform receives it. */
function startAutosave() {
  const { platform, calls, writes } = createFakePlatform();
  let progress: GameProgress = { ...DEFAULT_PROGRESS };
  const autosave = createMatchAutosave(async (saved) => {
    progress = withMatch(progress, saved, 1_000);
    await platform.saveProgress(JSON.stringify(progress));
  });
  return { autosave, platform, calls, writes, progress: () => progress };
}

function savedMatchOf(blob: string) {
  const match = parseProgress(blob).match;
  if (match === null) throw new Error('expected a stored match');
  return match;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('live match autosave', () => {
  it('writes once per completed turn, after the debounce', async () => {
    const game = newGame();
    const { autosave, calls } = startAutosave();

    game.playSeatTurn();
    autosave.schedule(game);
    expect(calls).toEqual([]);

    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);
    expect(calls).toEqual(['saveProgress']);

    game.playSeatTurn();
    autosave.schedule(game);
    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);
    expect(calls).toEqual(['saveProgress', 'saveProgress']);
  });

  it('coalesces rapid turns into one write of the latest state', async () => {
    const game = newGame();
    const { autosave, writes } = startAutosave();

    game.playSeatTurn();
    autosave.schedule(game);
    game.playSeatTurn();
    autosave.schedule(game);

    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);
    expect(writes).toHaveLength(1);

    const match = savedMatchOf(writes[0]);
    expect(match.version).toBe(MATCH_VERSION);
    expect(match.snapshot.turnNumber).toBe(game.turnNumber);
    expect(match.snapshot.currentPlayerIndex).toBe(game.playerIndex);
  });

  it('flushes the pending turn at once, and only once', async () => {
    const game = newGame();
    const { autosave, calls } = startAutosave();

    game.playSeatTurn();
    autosave.schedule(game);
    autosave.flush();
    autosave.flush();
    await Promise.resolve();

    expect(calls).toEqual(['saveProgress']);
    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);
    expect(calls).toEqual(['saveProgress']);
  });

  it('ignores a re-layout that hands it the same state', async () => {
    const game = newGame();
    const { autosave, calls } = startAutosave();

    game.playSeatTurn();
    autosave.schedule(game);
    autosave.schedule(game);
    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);

    expect(calls).toEqual(['saveProgress']);
  });

  it('never surfaces a rejected write and retries on the next turn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onSave = vi.fn(async () => {
      throw new Error('quota');
    });
    const autosave = createMatchAutosave(onSave);
    const game = newGame();

    game.playSeatTurn();
    autosave.schedule(game);
    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);

    autosave.schedule(game);
    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('drops nothing when the game is over; the caller clears the match instead', () => {
    const game = newGame();
    const { autosave, calls } = startAutosave();
    game.gameOver = true;

    autosave.schedule(game);
    autosave.flush();

    expect(calls).toEqual([]);
  });

  it('keeps the whole blob far under the 200 KB platform limit', async () => {
    const game = newGame();
    game.playSeatTurn();
    const { autosave, writes } = startAutosave();

    autosave.schedule(game);
    await vi.advanceTimersByTimeAsync(MATCH_SAVE_DELAY_MS);

    expect(writes[0].length).toBeLessThan(50_000);
  });
});

describe('resume envelope', () => {
  it('restores the saved seat, turn and dice ledger', () => {
    const game = newGame();
    game.playSeatTurn();
    game.rollDice();
    const saved = snapshot(game);

    const parsed = savedMatchOf(JSON.stringify(withMatch(DEFAULT_PROGRESS, saved, 500)));
    const restored = fromSave(parsed.snapshot);

    expect(restored.playerIndex).toBe(game.playerIndex);
    expect(restored.turnNumber).toBe(game.turnNumber);
    expect(restored.remainingDice).toEqual(game.remainingDice);
    expect(restored.rolledDice).toEqual(game.rolledDice);
    expect(toJson(restored)).toBe(toJson(game));
  });

  it('restores the board and the human seats of a mid-game snapshot', () => {
    const game = newGame();
    game.playSeatTurn();
    const saved = snapshot(game);

    const restored = fromSave(saved);

    for (let playerIndex = 0; playerIndex < game.config.numberOfPlayers; playerIndex += 1) {
      expect(restored.isHuman(playerIndex)).toBe(game.isHuman(playerIndex));
      for (let pawnIndex = 0; pawnIndex < game.config.numberOfPawns; pawnIndex += 1) {
        expect(restored.board.position.cellOf(playerIndex, pawnIndex)).toBe(game.board.position.cellOf(playerIndex, pawnIndex));
        expect(restored.board.pawnState(playerIndex, pawnIndex)).toBe(game.board.pawnState(playerIndex, pawnIndex));
      }
    }
  });

  it('discards an older version and offers no continue entry', () => {
    const snapshotValue = snapshot(newGame());
    const old = JSON.stringify({
      ...DEFAULT_PROGRESS,
      match: { version: MATCH_VERSION - 1, savedAt: 1_000, snapshot: snapshotValue },
    });

    expect(parseProgress(old).match).toBeNull();
  });

  it('discards a corrupt snapshot or blob but keeps the settings', () => {
    const corrupt = JSON.stringify({
      ...DEFAULT_PROGRESS,
      difficulty: 'hard',
      match: { version: MATCH_VERSION, savedAt: 1_000, snapshot: { players: [] } },
    });

    expect(parseProgress(corrupt)).toMatchObject({ difficulty: 'hard', match: null });
    expect(parseProgress('not json').match).toBeNull();
    expect(parseProgress('{"sound":false,"match":"junk"}')).toMatchObject({ sound: false, match: null });
  });

  it('does not offer a continue entry for a finished game', () => {
    const finished: SavedGame = { ...snapshot(newGame()), gameOver: true };
    const blob = JSON.stringify(withMatch(DEFAULT_PROGRESS, finished, 1_000));

    expect(parseProgress(blob).match).toBeNull();
  });

  it('a finished or replaced match clears the stored entry in one write', async () => {
    const { platform, writes } = createFakePlatform();
    const stored = withMatch(DEFAULT_PROGRESS, snapshot(newGame()), 1_000);

    const next = await recordCompletedGame(platform, withoutMatch(stored));

    expect(next.gamesPlayed).toBe(1);
    expect(writes).toHaveLength(1);
    expect(parseProgress(writes[0]).match).toBeNull();
  });
});
