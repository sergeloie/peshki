import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, applyMove, hasWon } from '../../src/engine';
import type { StepMove } from '../../src/engine';
import { eventTypes, setupBoard, setupGame, stepMove } from './helpers';

/** Three pawns home and the last one seven cells short of its own corner. */
const SEVEN_SHORT = [
  { player: 0, pawn: 0, cell: 21 },
  { player: 0, pawn: 1, cell: 28 },
  { player: 0, pawn: 2, cell: 29 },
  { player: 0, pawn: 3, cell: 30 },
];

describe('RULES.MD §16 victory and draw', () => {
  it('item 17: the last pawn landing exactly on its corner wins', () => {
    const game = setupGame({ rolls: [[3, 4]], pawns: SEVEN_SHORT });
    game.rollDice();

    const seven = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 7)!;
    const events = game.apply(seven);

    expect(game.board.position.cellOf(0, 0)).toBe(0);
    expect(eventTypes(events)).toContain('gameWon');
    expect(game.gameOver).toBe(true);
    expect(game.result).toBe('won');
    expect(game.winnerPlayerIndex).toBe(0);
  });

  it('item 18: an eight over the corner is not a legal move and wins nothing', () => {
    const game = setupGame({ rolls: [[4, 4]], pawns: SEVEN_SHORT });
    game.rollDice();

    expect(game.board.findTarget(0, 0, 8)).toBeNull();
    expect(game.legalMoves().some((move) => move.steps === 8)).toBe(false);
    expect(game.gameOver).toBe(false);
    expect(game.result).toBe('playing');
  });

  it('item 19: a last pawn that does not reach the corner just walks the ring', () => {
    const game = setupGame({
      rolls: [[3, 4]],
      pawns: [...SEVEN_SHORT.slice(1), { player: 0, pawn: 0, cell: 10 }],
    });
    game.rollDice();

    const seven = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 7)!;
    game.apply(seven);

    expect(game.board.position.cellOf(0, 0)).toBe(17);
    expect(game.gameOver).toBe(false);
  });

  it('item 20: after the win the game takes no further roll and no further move', () => {
    const game = setupGame({ rolls: [[3, 4], [1, 2]], pawns: SEVEN_SHORT });
    game.rollDice();
    const seven = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 7)!;
    game.apply(seven);

    const over = [{ type: 'moveRejected', reason: 'game is over' }];
    expect(game.rollDice()).toEqual(over);
    expect(game.apply(seven)).toEqual(over);
    expect(game.legalMoves()).toEqual([]);
    expect(game.playSeatTurn()).toEqual([]);
    expect(game.playerIndex).toBe(0);
  });

  it('item 21: the turn limit is a draw, not a winner', () => {
    const game = setupGame({ config: { ...DEFAULT_CONFIG, maxTurns: 2 }, rolls: [[1, 2], [1, 2], [1, 2]] });

    game.rollDice();
    const events = game.rollDice();

    expect(eventTypes(events)).toEqual(['diceRolled', 'turnEnded', 'gameDrawn']);
    expect(game.gameOver).toBe(true);
    expect(game.result).toBe('draw');
    expect(game.winnerPlayerIndex).toBe(-1);
    expect(game.turnNumber).toBe(2);
    expect(game.legalMoves()).toEqual([]);
  });

  it('item 22: a last pawn killed onto the bench breaks the exact-corner mode', () => {
    const board = setupBoard([
      { player: 0, pawn: 0, cell: 0 },
      { player: 0, pawn: 1, cell: 28 },
      { player: 0, pawn: 2, cell: 29 },
      { player: 0, pawn: 3, cell: 30 },
      { player: 1, pawn: 0, cell: 26 },
    ]);
    expect(hasWon(board, 0)).toBe(true);

    applyMove(board, stepMove(board, 1, 0, 2));

    expect(board.position.isBench(0, 0)).toBe(true);
    expect(hasWon(board, 0)).toBe(false);
  });

  it('item 22: a killed last pawn is not a victory for anyone and play goes on', () => {
    const game = setupGame({
      rolls: [[2, 3]],
      playerIndex: 1,
      pawns: [
        { player: 0, pawn: 0, cell: 0 },
        { player: 0, pawn: 1, cell: 28 },
        { player: 0, pawn: 2, cell: 29 },
        { player: 0, pawn: 3, cell: 30 },
        { player: 1, pawn: 0, cell: 26 },
      ],
    });
    game.rollDice();

    const kill = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 2)!;
    const events = game.apply(kill);

    expect(eventTypes(events)).toContain('pawnKilled');
    expect(game.gameOver).toBe(false);
    expect(game.winnerPlayerIndex).toBe(-1);
    expect(hasWon(game.board, 0)).toBe(false);
  });
});
