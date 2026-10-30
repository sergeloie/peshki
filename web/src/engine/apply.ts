import type { Board } from './board';
import type { GameEvent } from './events';
import type { Move } from './moves';

export function applyMove(board: Board, move: Move): GameEvent[] {
  if (move.kind === 'place') return applyPlace(board, move);

  const fromCell = board.position.cellOf(move.playerIndex, move.pawnIndex);
  if (fromCell < 0) return [rejected('pawn is on the bench')];
  const target = board.findTarget(move.playerIndex, move.pawnIndex, move.steps);
  if (target === null) return [rejected('no legal target')];

  const events: GameEvent[] = [];
  walk(board, move.playerIndex, move.pawnIndex, move.steps, events);
  return events;
}

function applyPlace(board: Board, move: Extract<Move, { kind: 'place' }>): GameEvent[] {
  const { playerIndex, pawnIndex, steps } = move;
  const corner = board.cornerCell(playerIndex);
  if (board.benchPawns(playerIndex).length === 0) return [rejected('no pawn on the bench')];
  const occupant = board.occupantAt(corner);
  if (occupant !== null && occupant.playerIndex === playerIndex) return [rejected('own pawn on the corner')];
  if (steps > 0 && board.findTargetFromCorner(playerIndex, steps) === null) return [rejected('no legal walk from the corner')];

  const events: GameEvent[] = [];
  if (occupant !== null) {
    events.push({
      type: 'pawnKilled',
      killerPlayerIndex: playerIndex,
      killerPawnIndex: pawnIndex,
      victimPlayerIndex: occupant.playerIndex,
      victimPawnIndex: occupant.pawnIndex,
    });
    board.capturePawn(occupant.playerIndex, occupant.pawnIndex);
  }

  board.placePawn(playerIndex, pawnIndex, corner);
  events.push({ type: 'pawnPlaced', playerIndex, pawnIndex, cellIndex: corner });
  if (steps > 0) walk(board, playerIndex, pawnIndex, steps, events);
  return events;
}

function walk(board: Board, playerIndex: number, pawnIndex: number, steps: number, events: GameEvent[]): void {
  const fromCell = board.position.cellOf(playerIndex, pawnIndex);
  const target = board.findTarget(playerIndex, pawnIndex, steps);
  if (target === null) return;

  const occupant = board.occupantAt(target);
  if (!board.isHome(playerIndex, pawnIndex) && occupant !== null && occupant.playerIndex !== playerIndex) {
    events.push({
      type: 'pawnKilled',
      killerPlayerIndex: playerIndex,
      killerPawnIndex: pawnIndex,
      victimPlayerIndex: occupant.playerIndex,
      victimPawnIndex: occupant.pawnIndex,
    });
    board.capturePawn(occupant.playerIndex, occupant.pawnIndex);
  }

  board.movePawn(playerIndex, pawnIndex, target);
  events.push({ type: 'pawnMoved', playerIndex, pawnIndex, fromCell, toCell: target, steps });
  if (board.isHome(playerIndex, pawnIndex)) events.push({ type: 'enteredHome', playerIndex, pawnIndex });
}

function rejected(reason: string): GameEvent {
  return { type: 'moveRejected', reason };
}
