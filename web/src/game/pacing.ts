/** Art direction §8: a bot action lands after a readable beat, never instantly. */
export const DECISION_MIN_MS = 400;
export const DECISION_MAX_MS = 700;
/** Visible pause when the turn passes back to the human. */
export const HANDOVER_MS = 250;

export function decisionDelay(random: () => number): number {
  return DECISION_MIN_MS + Math.floor(random() * (DECISION_MAX_MS - DECISION_MIN_MS + 1));
}
