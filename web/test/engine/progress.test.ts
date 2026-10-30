import { describe, expect, it } from 'vitest';
import { setupBoard } from './helpers';

describe('pawn progress and display numbering (RULES.MD §12)', () => {
  it('orders states from bench to the end of the home tail', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 0, moved: false },
      { player: 0, pawn: 1, cell: 1 },
      { player: 0, pawn: 2, cell: 26 },
      { player: 0, pawn: 3, cell: 30 },
    ]);

    expect(board.pawnProgress(0, 0)).toBe(-1);
    expect(board.pawnProgress(0, 1)).toBe(0);
    expect(board.pawnProgress(0, 2)).toBe(25);
    expect(board.pawnProgress(0, 3)).toBe(1002);
    expect(setupBoard().pawnProgress(0, 0)).toBe(-2);
  });

  it('numbers the closest pawn #1 and breaks ties by the lower pawn index', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 28 },
      { player: 0, pawn: 1, cell: 29 },
      { player: 0, pawn: 2, cell: 30 },
    ]);

    expect(board.displayNumbers(0)).toEqual([2, 1, 0, 3]);
    expect(setupBoard().displayNumbers(0)).toEqual([0, 1, 2, 3]);
  });
});
