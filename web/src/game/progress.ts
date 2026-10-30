import type { Difficulty } from '../engine';
import { DIFFICULTIES } from '../engine';
import { parseSavedGame } from '../engine/save';
import type { SavedGame } from '../engine/save';
import type { Platform } from '../platform/ysdk';
import type { Language } from '../i18n';

/** Stored match payload version; bump whenever MatchEnvelope changes shape. */
export const MATCH_VERSION = 1;

/** A live match wrapped for storage; an unreadable or stale one is dropped on load. */
export interface MatchEnvelope {
  version: number;
  savedAt: number;
  snapshot: SavedGame;
}

export interface GameProgress {
  difficulty: Difficulty;
  gamesPlayed: number;
  /** Tutorial concepts already acknowledged, ids from HINT_IDS (ui/hints.ts maps them to copy). */
  hintsSeen: string[];
  sound: boolean;
  /** Player's manual language; null follows the platform. */
  language: Language | null;
  /** Unfinished match for the resume entry point; null when there is none. */
  match: MatchEnvelope | null;
}

/** The first two completed games always run on novice (ticket #5). */
export const NOVICE_GAMES = 2;

/** Tutorial concepts, in teaching order (ui/hints.ts reads their copy). */
export const HINT_IDS = ['goal', 'move', 'six', 'kill'] as const;

export type HintId = (typeof HINT_IDS)[number];

export const DEFAULT_PROGRESS: GameProgress = {
  difficulty: 'normal',
  gamesPlayed: 0,
  hintsSeen: [],
  sound: true,
  language: null,
  match: null,
};

export function parseProgress(text: string | null): GameProgress {
  if (text === null) return { ...DEFAULT_PROGRESS, hintsSeen: [], language: null };
  try {
    const value = JSON.parse(text) as Partial<GameProgress>;
    return {
      difficulty: isDifficulty(value.difficulty) ? value.difficulty : DEFAULT_PROGRESS.difficulty,
      gamesPlayed: Number.isInteger(value.gamesPlayed) && (value.gamesPlayed as number) >= 0 ? (value.gamesPlayed as number) : 0,
      hintsSeen: Array.isArray(value.hintsSeen) ? [...new Set(value.hintsSeen.filter(isHintId))] : [],
      sound: typeof value.sound === 'boolean' ? value.sound : true,
      language: value.language === 'ru' || value.language === 'en' ? value.language : null,
      match: parseMatch(value.match),
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

/** Novice for the first two completed games, then the stored choice. */
export function effectiveDifficulty(progress: GameProgress): Difficulty {
  return progress.gamesPlayed < NOVICE_GAMES ? 'novice' : progress.difficulty;
}

/** Hint texts the next game still has to teach, in teaching order. */
export function pendingHints(progress: GameProgress): HintId[] {
  return HINT_IDS.filter((id) => !progress.hintsSeen.includes(id));
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

/** Saves any blob change (settings, hints); save-on-change, no debounce. */
export async function persistProgress(platform: Pick<Platform, 'saveProgress'>, progress: GameProgress): Promise<void> {
  await platform.saveProgress(JSON.stringify(progress));
}

/** Wraps a live snapshot in the versioned envelope for the progress blob. */
export function withMatch(progress: GameProgress, snapshot: SavedGame, savedAt: number): GameProgress {
  return { ...progress, match: { version: MATCH_VERSION, savedAt, snapshot } };
}

/** Drops the stored match so the next boot does not offer a corpse. */
export function withoutMatch(progress: GameProgress): GameProgress {
  return progress.match === null ? progress : { ...progress, match: null };
}

/** Unknown versions, finished games and corrupt snapshots all read as "no match". */
function parseMatch(value: unknown): MatchEnvelope | null {
  if (typeof value !== 'object' || value === null) return null;
  const envelope = value as Partial<MatchEnvelope>;
  if (envelope.version !== MATCH_VERSION) return null;
  if (typeof envelope.savedAt !== 'number') return null;
  try {
    const snapshot = parseSavedGame(envelope.snapshot);
    return snapshot.gameOver ? null : { version: MATCH_VERSION, savedAt: envelope.savedAt, snapshot };
  } catch {
    return null;
  }
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}

function isHintId(value: unknown): value is HintId {
  return typeof value === 'string' && (HINT_IDS as readonly string[]).includes(value);
}
