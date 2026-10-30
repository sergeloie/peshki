import type { Difficulty } from '../engine';
import { DIFFICULTIES } from '../engine';
import type { Platform } from '../platform/ysdk';

export interface GameProgress {
  difficulty: Difficulty;
  gamesPlayed: number;
}

/** The first two completed games always run on novice (ticket #5). */
export const NOVICE_GAMES = 2;

export const DEFAULT_PROGRESS: GameProgress = { difficulty: 'normal', gamesPlayed: 0 };

export function parseProgress(text: string | null): GameProgress {
  if (text === null) return { ...DEFAULT_PROGRESS };
  try {
    const value = JSON.parse(text) as Partial<GameProgress>;
    return {
      difficulty: isDifficulty(value.difficulty) ? value.difficulty : DEFAULT_PROGRESS.difficulty,
      gamesPlayed: Number.isInteger(value.gamesPlayed) && (value.gamesPlayed as number) >= 0 ? (value.gamesPlayed as number) : 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/** Novice for the first two completed games, then the stored choice. */
export function effectiveDifficulty(progress: GameProgress): Difficulty {
  return progress.gamesPlayed < NOVICE_GAMES ? 'novice' : progress.difficulty;
}

export async function loadGameProgress(platform: Pick<Platform, 'loadProgress'>): Promise<GameProgress> {
  try {
    return parseProgress(await platform.loadProgress());
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/** Writes once on game end; no debounce machinery yet. */
export async function recordCompletedGame(
  platform: Pick<Platform, 'saveProgress'>,
  progress: GameProgress,
): Promise<GameProgress> {
  const next = { ...progress, gamesPlayed: progress.gamesPlayed + 1 };
  await platform.saveProgress(JSON.stringify(next));
  return next;
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}
