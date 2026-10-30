import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, effectiveDifficulty, parseProgress, recordCompletedGame } from '../src/game/progress';

describe('difficulty progression', () => {
  it('starts from the default when nothing is stored', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS);
  });

  it('reads a stored choice and drops junk', () => {
    expect(parseProgress('{"difficulty":"hard","gamesPlayed":4}')).toEqual({ difficulty: 'hard', gamesPlayed: 4 });
    expect(parseProgress('{"difficulty":"impossible","gamesPlayed":-1}')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress('not json')).toEqual(DEFAULT_PROGRESS);
  });

  it('forces novice for the first two completed games, then honours the choice', () => {
    expect(effectiveDifficulty({ difficulty: 'hard', gamesPlayed: 0 })).toBe('novice');
    expect(effectiveDifficulty({ difficulty: 'hard', gamesPlayed: 1 })).toBe('novice');
    expect(effectiveDifficulty({ difficulty: 'hard', gamesPlayed: 2 })).toBe('hard');
    expect(effectiveDifficulty({ difficulty: 'normal', gamesPlayed: 9 })).toBe('normal');
  });

  it('writes one small JSON blob and counts the finished game', async () => {
    let saved: string | null = null;
    const next = await recordCompletedGame({ saveProgress: async (data) => { saved = data; } }, DEFAULT_PROGRESS);

    expect(next.gamesPlayed).toBe(1);
    expect(JSON.parse(saved ?? '{}')).toEqual(next);
  });
});
