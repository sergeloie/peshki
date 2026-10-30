import { describe, expect, it } from 'vitest';
import { applyMove, generateMoves, moveKey } from '../../src/engine';
import { eventTypes, setupBoard } from './helpers';

describe('RULES.MD §16 placement', () => {
  it('item 10: a 6 with an empty corner offers place and place-and-move', () => {
    const board = setupBoard();

    const moves = generateMoves(board, 0, [6, 2]);
    const place = moves.find((move) => move.kind === 'place' && move.steps === 0);
    const placeAndMove = moves.find((move) => move.kind === 'place' && move.steps === 2);

    expect(place?.targetCellIndex).toBe(0);
    expect(placeAndMove?.targetCellIndex).toBe(2);

    applyMove(board, placeAndMove!);
    expect(board.position.cellOf(0, 0)).toBe(2);
    expect(board.pawnState(0, 0)).toBe('FIELDER');
  });

  it('item 11: an own pawn on the corner blocks placement', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 0, moved: false }]);

    const moves = generateMoves(board, 0, [6, 2]);

    expect(moves.some((move) => move.kind === 'place')).toBe(false);
  });

  it('item 12: placement on an enemy corner kills the enemy and places a NEWBORN', () => {
    const board = setupBoard([{ player: 1, pawn: 0, cell: 0 }]);
    const place = generateMoves(board, 0, [6, 2]).find((move) => move.kind === 'place' && move.steps === 0)!;

    const events = applyMove(board, place);

    expect(board.position.isBench(1, 0)).toBe(true);
    expect(board.position.cellOf(0, 0)).toBe(0);
    expect(board.pawnState(0, 0)).toBe('NEWBORN');
    expect(events).toContainEqual({
      type: 'pawnKilled',
      killerPlayerIndex: 0,
      killerPawnIndex: 0,
      victimPlayerIndex: 1,
      victimPawnIndex: 0,
    });
    expect(eventTypes(events)).toContain('pawnPlaced');
  });
});

describe('RULES.MD §16 dice and move lists', () => {
  it('item 13: [3, 4] yields moves on 3, 4 and 7 without duplicates', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 3 }]);

    const moves = generateMoves(board, 0, [3, 4]);

    expect(moves.map((move) => move.steps).sort((a, b) => a - b)).toEqual([3, 4, 7]);
    expect(new Set(moves.map(moveKey)).size).toBe(moves.length);
  });

  it('item 14: [6, 6] yields one 6 per pawn and a 12, without duplicate 6s', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 3 },
      { player: 0, pawn: 1, cell: 28 },
      { player: 0, pawn: 2, cell: 29 },
      { player: 0, pawn: 3, cell: 30 },
    ]);

    const moves = generateMoves(board, 0, [6, 6]);

    expect(moves.map((move) => move.steps).sort((a, b) => a - b)).toEqual([6, 12]);
    expect(new Set(moves.map(moveKey)).size).toBe(moves.length);
  });
});

describe('placement availability', () => {
  it('an own pawn on the corner blocks a placement, leaving no place moves', () => {
    const board = setupBoard([{ player: 0, pawn: 0, cell: 0, moved: false }]);

    expect(generateMoves(board, 0, [6, 6]).filter((move) => move.kind === 'place')).toEqual([]);
  });

  it('an enemy pawn on the corner allows a killing placement', () => {
    const board = setupBoard([{ player: 1, pawn: 3, cell: 0 }]);

    const place = generateMoves(board, 0, [6, 6]).find((move) => move.kind === 'place' && move.steps === 0);

    expect(place).toBeDefined();
    applyMove(board, place!);
    expect(board.position.isBench(1, 3)).toBe(true);
    expect(board.position.cellOf(0, 0)).toBe(0);
  });
});
