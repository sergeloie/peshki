import { Board, DEFAULT_CONFIG } from '../../src/engine';
import type { GameEvent, StepMove } from '../../src/engine';

export interface PawnSetup {
  player: number;
  pawn: number;
  cell: number;
  moved?: boolean;
}

export function setupBoard(pawns: PawnSetup[] = []): Board {
  const board = new Board(DEFAULT_CONFIG);
  for (const setup of pawns) {
    if (setup.moved ?? true) board.position.move(setup.player, setup.pawn, setup.cell);
    else board.position.place(setup.player, setup.pawn, setup.cell);
  }
  return board;
}

export function stepMove(
  board: Board,
  playerIndex: number,
  pawnIndex: number,
  steps: number,
  dice: number[] = [steps],
): StepMove {
  const target = board.findTarget(playerIndex, pawnIndex, steps);
  if (target === null) throw new Error(`No target for ${steps} steps`);
  return { kind: 'step', playerIndex, pawnIndex, steps, consumedDice: dice, targetCellIndex: target };
}

export function eventTypes(events: GameEvent[]): string[] {
  return events.map((event) => event.type);
}
