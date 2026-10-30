import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, applyMove, generateMoves } from '../../src/engine';
import { eventTypes, setupBoard, stepMove } from './helpers';

describe('RULES.MD §16 movement', () => {
  it('item 1: a FIELDER walks N cells along nextRing on a free path', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 3 }]);

    const events = applyMove(board, stepMove(board, 0, 0, 2));

    expect(board.position.cellOf(0, 0)).toBe(5);
    expect(events).toContainEqual({ type: 'pawnMoved', playerIndex: 0, pawnIndex: 0, fromCell: 3, toCell: 5, steps: 2 });
  });

  it('item 2: an occupied intermediate cell rejects the whole move', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 3 },
      { player: 1, pawn: 0, cell: 4 },
    ]);

    expect(board.findTarget(0, 0, 2)).toBeNull();
    expect(generateMoves(board, 0, [2]).some((move) => move.kind === 'step' && move.pawnIndex === 0)).toBe(false);
  });

  it('item 3: a friendly pawn on the target rejects the move', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 3 },
      { player: 0, pawn: 1, cell: 5 },
    ]);

    expect(board.findTarget(0, 0, 2)).toBeNull();
  });

  it('item 4: an enemy pawn on a ring target is killed and benched', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 3 },
      { player: 1, pawn: 2, cell: 5 },
    ]);

    const events = applyMove(board, stepMove(board, 0, 0, 2));

    expect(board.position.cellOf(0, 0)).toBe(5);
    expect(board.position.isBench(1, 2)).toBe(true);
    expect(events).toContainEqual({
      type: 'pawnKilled',
      killerPlayerIndex: 0,
      killerPawnIndex: 0,
      victimPlayerIndex: 1,
      victimPawnIndex: 2,
    });
    // The extra turn that follows a kill is ticket #4.
  });

  it('item 5: a NEWBORN on the corner walks the ring and never enters home directly', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: boardCorner(0), moved: false }]);

    const events = applyMove(board, stepMove(board, 0, 0, 1));

    expect(board.position.cellOf(0, 0)).toBe(1);
    expect(board.pawnState(0, 0)).toBe('FIELDER');
    expect(events).toContainEqual({ type: 'pawnMoved', playerIndex: 0, pawnIndex: 0, fromCell: 0, toCell: 1, steps: 1 });
    expect(eventTypes(events)).not.toContain('enteredHome');
  });

  it('item 6: a FIELDER on the own corner enters the first home cell in one step', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 0 }]);

    applyMove(board, stepMove(board, 0, 0, 1));

    expect(board.position.cellOf(0, 0)).toBe(board.topology.ringLength);
    expect(board.pawnState(0, 0)).toBe('HOMER');
  });

  it('item 7: a pawn two cells before the corner enters the first home cell with a 3', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 26 }]);

    applyMove(board, stepMove(board, 0, 0, 3));

    expect(board.position.cellOf(0, 0)).toBe(28);
    expect(board.pawnState(0, 0)).toBe('HOMER');
  });

  it('item 8: a HOMER cannot walk past the end of its tail', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 30 }]);

    expect(board.findTarget(0, 0, 2)).toBeNull();
  });

  it('item 9: a HOMER shifts inside the tail and stays HOMER', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 28 }]);

    applyMove(board, stepMove(board, 0, 0, 2));

    expect(board.position.cellOf(0, 0)).toBe(30);
    expect(board.pawnState(0, 0)).toBe('HOMER');
  });
  it('walks the rest of the ring and then enters the home tail', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 1 }]);

    applyMove(board, stepMove(board, 0, 0, 27));
    expect(board.position.cellOf(0, 0)).toBe(0);
    expect(board.pawnState(0, 0)).toBe('FIELDER');

    applyMove(board, stepMove(board, 0, 0, 1));
    expect(board.position.cellOf(0, 0)).toBe(board.topology.ringLength);
    expect(board.pawnState(0, 0)).toBe('HOMER');
  });
});

function boardCorner(playerIndex: number): number {
  return playerIndex * (DEFAULT_CONFIG.sideLength - 1);
}
