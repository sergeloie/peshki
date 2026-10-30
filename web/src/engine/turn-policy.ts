/**
 * RULES.MD §10.3: a six or a kill in the rolled cycle grants a re-roll for the
 * same player. The two conditions do not stack — a six plus a kill is one extra
 * roll — but every later cycle judges its own dice and kills again.
 */
export function grantsExtraTurn(dice: readonly number[], killedThisTurn: boolean): boolean {
  return killedThisTurn || dice.includes(6);
}
