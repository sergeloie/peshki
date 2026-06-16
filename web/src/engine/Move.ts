import type { Pawn } from './Pawn';

export interface Move {
  pawn: Pawn | null;
  steps: number;
  consumedDice: number[];
}
