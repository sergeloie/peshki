import type { Board } from './board';

export interface StepMove {
  readonly kind: 'step';
  readonly playerIndex: number;
  readonly pawnIndex: number;
  readonly steps: number;
  readonly consumedDice: number[];
  readonly targetCellIndex: number;
}

export interface PlaceMove {
  readonly kind: 'place';
  readonly playerIndex: number;
  readonly pawnIndex: number;
  /** 0 for place-only; the follow-up walk length for place-and-move. */
  readonly steps: number;
  readonly consumedDice: number[];
  readonly targetCellIndex: number;
}

export type Move = StepMove | PlaceMove;

export function moveKey(move: Move): string {
  return [move.kind, move.playerIndex, move.pawnIndex, move.steps, [...move.consumedDice].sort((a, b) => a - b).join('+')].join('|');
}

/** Every legal move for a roll (RULES.MD §10.2), deduplicated per §6.3. */
export function generateMoves(board: Board, playerIndex: number, dice: readonly number[]): Move[] {
  const moves: Move[] = [];
  const seen = new Set<string>();
  const add = (move: Move) => {
    const key = moveKey(move);
    if (seen.has(key)) return;
    seen.add(key);
    moves.push(move);
  };

  const movable = board.movablePawns(playerIndex);
  for (const value of distinctValues(dice)) {
    for (const pawnIndex of movable) {
      const target = board.findTarget(playerIndex, pawnIndex, value);
      if (target !== null) {
        add({ kind: 'step', playerIndex, pawnIndex, steps: value, consumedDice: [value], targetCellIndex: target });
      }
    }
  }

  if (dice.length === 2) {
    const sum = dice[0] + dice[1];
    for (const pawnIndex of movable) {
      const target = board.findTarget(playerIndex, pawnIndex, sum);
      if (target !== null) {
        add({ kind: 'step', playerIndex, pawnIndex, steps: sum, consumedDice: [...dice], targetCellIndex: target });
      }
    }
  }

  const bench = board.benchPawns(playerIndex);
  if (dice.includes(6) && bench.length > 0) {
    const corner = board.cornerCell(playerIndex);
    const occupant = board.occupantAt(corner);
    if (occupant === null || occupant.playerIndex !== playerIndex) {
      const pawnIndex = bench[0];
      add({ kind: 'place', playerIndex, pawnIndex, steps: 0, consumedDice: [6], targetCellIndex: corner });

      const sixIndex = dice.indexOf(6);
      for (let index = 0; index < dice.length; index += 1) {
        if (index === sixIndex) continue;
        const value = dice[index];
        const target = board.findTargetFromCorner(playerIndex, value);
        if (target !== null) {
          add({ kind: 'place', playerIndex, pawnIndex, steps: value, consumedDice: [6, value], targetCellIndex: target });
        }
      }
    }
  }

  return moves;
}

function distinctValues(dice: readonly number[]): number[] {
  return [...new Set(dice)];
}
