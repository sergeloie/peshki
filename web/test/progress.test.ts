import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESS,
  HINT_IDS,
  effectiveDifficulty,
  parseProgress,
  pendingHints,
  recordCompletedGame,
} from '../src/game/progress';

describe('difficulty progression', () => {
  it('starts from the default when nothing is stored', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS);
  });

  it('reads a stored choice and drops junk', () => {
    expect(parseProgress('{"difficulty":"hard","gamesPlayed":4,"sound":false,"language":"en","hintsSeen":["goal"]}')).toEqual({
      difficulty: 'hard',
      gamesPlayed: 4,
      hintsSeen: ['goal'],
      sound: false,
      language: 'en',
      match: null,
    });
    expect(parseProgress('{"difficulty":"impossible","gamesPlayed":-1}')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress('not json')).toEqual(DEFAULT_PROGRESS);
  });

  it('keeps only the known hint ids in the blob', () => {
    const parsed = parseProgress('{"hintsSeen":["goal","banana","kill","goal"]}');
    expect(parsed.hintsSeen).toEqual(['goal', 'kill']);
  });

  it('forces novice for the first two completed games, then honours the choice', () => {
    expect(effectiveDifficulty({ ...DEFAULT_PROGRESS, difficulty: 'hard', gamesPlayed: 0 })).toBe('novice');
    expect(effectiveDifficulty({ ...DEFAULT_PROGRESS, difficulty: 'hard', gamesPlayed: 1 })).toBe('novice');
    expect(effectiveDifficulty({ ...DEFAULT_PROGRESS, difficulty: 'hard', gamesPlayed: 2 })).toBe('hard');
    expect(effectiveDifficulty({ ...DEFAULT_PROGRESS, difficulty: 'normal', gamesPlayed: 9 })).toBe('normal');
  });

  it('writes one small JSON blob and counts the finished game', async () => {
    let saved: string | null = null;
    const next = await recordCompletedGame({ saveProgress: async (data) => { saved = data; } }, DEFAULT_PROGRESS);

    expect(next.gamesPlayed).toBe(1);
    expect(JSON.parse(saved ?? '{}')).toEqual(next);
  });

  it('lists unseen hints in teaching order (first-game tutorial)', () => {
    expect(pendingHints({ ...DEFAULT_PROGRESS, hintsSeen: [] })).toEqual([...HINT_IDS]);
    expect(pendingHints({ ...DEFAULT_PROGRESS, hintsSeen: ['goal', 'move'] })).toEqual(['six', 'kill']);
    expect(pendingHints({ ...DEFAULT_PROGRESS, hintsSeen: [...HINT_IDS] })).toEqual([]);
  });
});
