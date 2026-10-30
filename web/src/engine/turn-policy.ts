/**
 * RULES.MD §10.3: any six or any kill grants a re-roll for the same player.
 * The conditions are OR-ed — a six plus a kill is still one extra roll.
 */
export function grantsExtraTurn(dice: readonly number[], killedThisTurn: boolean): boolean {
  return killedThisTurn || dice.includes(6);
}
