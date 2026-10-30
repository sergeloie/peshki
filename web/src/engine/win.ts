import type { Board } from './board';

/**
 * RULES.MD §11.1: all but one pawn home and the last one exactly on the own
 * corner. Overflight is not a win (the move is illegal in the first place).
 */
export function hasWon(board: Board, playerIndex: number): boolean {
  if (board.countHome(playerIndex) !== board.config.numberOfPawns - 1) return false;

  for (let pawnIndex = 0; pawnIndex < board.config.numberOfPawns; pawnIndex += 1) {
    if (board.isHome(playerIndex, pawnIndex)) continue;
    if (board.isBench(playerIndex, pawnIndex) || board.isNewborn(playerIndex, pawnIndex)) return false;
    return board.position.cellOf(playerIndex, pawnIndex) === board.cornerCell(playerIndex);
  }
  return false;
}
