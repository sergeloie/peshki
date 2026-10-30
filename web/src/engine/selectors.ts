import type { Move } from './moves';

/** The single move-choice seam shared by the UI and the bots (ADR-0001). */
export type MoveSelector = (legal: readonly Move[]) => Move | null;

/**
 * First legal move only. Kept as the default seat driver for tests; the game
 * screen drives seats with `createBot` (`bot.ts`).
 */
export const firstLegalMove: MoveSelector = (legal) => legal[0] ?? null;
