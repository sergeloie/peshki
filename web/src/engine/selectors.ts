import type { Move } from './moves';

/** The single move-choice seam shared by the UI and the bots (ADR-0001). */
export type MoveSelector = (legal: readonly Move[]) => Move | null;

/**
 * Placeholder seat driver for non-human players.
 * shortcut: first legal move only, ticket #5 replaces it with the heuristic bot.
 */
export const firstLegalMove: MoveSelector = (legal) => legal[0] ?? null;
