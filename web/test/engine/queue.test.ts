import { describe, expect, it } from 'vitest';
import type { Game, GameEvent, StepMove } from '../../src/engine';
import { eventTypes, setupGame } from './helpers';

// Three pawns home and the last one at the far ring cell: no dice fit it.
const HOME_AND_TAIL = [
  { player: 0, pawn: 0, cell: 27 },
  { player: 0, pawn: 1, cell: 28 },
  { player: 0, pawn: 2, cell: 29 },
  { player: 0, pawn: 3, cell: 30 },
];

describe('RULES.MD §16 dice and queue', () => {
  it('item 15: a six with no legal move gives the same player the re-roll', () => {
    const game = setupGame({ rolls: [[6, 6], [1, 2]], pawns: HOME_AND_TAIL });

    const first = game.rollDice();

    expect(eventTypes(first)).toEqual(['diceRolled']);
    expect(game.playerIndex).toBe(0);
    expect(game.remainingDice).toEqual([]);

    expect(game.rollDice()).toEqual([{ type: 'diceRolled', playerIndex: 0, values: [1, 2] }]);
  });

  it('item 15: a six on the bonus roll chains another roll for the same seat', () => {
    const game = setupGame({ rolls: [[6, 6], [6, 6]], pawns: HOME_AND_TAIL });
    game.rollDice();

    const events = game.rollDice();

    expect(eventTypes(events)).toEqual(['diceRolled']);
    expect(game.playerIndex).toBe(0);
    expect(game.turnNumber).toBe(2);
    expect(game.remainingDice).toEqual([]);
  });

  it('item 16: a kill without a six grants an extra roll', () => {
    const game = setupGame({
      rolls: [[2, 3], [1, 1]],
      pawns: [
        { player: 0, pawn: 0, cell: 3 },
        { player: 1, pawn: 0, cell: 5 },
      ],
    });
    game.rollDice();

    const kill = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 2)!;
    const killEvents = game.apply(kill);
    expect(eventTypes(killEvents)).toContain('pawnKilled');

    const walk = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 3)!;
    const walkEvents = game.apply(walk);
    expect(eventTypes(walkEvents)).not.toContain('turnEnded');
    expect(game.playerIndex).toBe(0);
  });

  it('item 16: a six and a kill in one cycle grant one bonus roll, not two', () => {
    const game = setupGame({
      rolls: [[6, 2], [1, 2]],
      pawns: [
        { player: 0, pawn: 0, cell: 3 },
        { player: 1, pawn: 0, cell: 5 },
      ],
    });
    game.rollDice();

    const kill = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 2)!;
    expect(eventTypes(game.apply(kill))).toContain('pawnKilled');
    const six = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 6)!;
    expect(eventTypes(game.apply(six))).not.toContain('turnEnded');

    // One bonus roll, not two: a single completed cycle and an empty dice ledger.
    expect(game.playerIndex).toBe(0);
    expect(game.turnNumber).toBe(1);
    expect(game.remainingDice).toEqual([]);

    game.rollDice();
    expect(eventTypes(spendAll(game))).toContain('turnEnded');
    expect(game.playerIndex).toBe(1);
    expect(game.turnNumber).toBe(2);
  });

  it('a clean cycle ends the turn even after a cycle with a kill', () => {
    const game = setupGame({
      rolls: [[2, 3], [1, 2]],
      pawns: [
        { player: 0, pawn: 0, cell: 3 },
        { player: 1, pawn: 0, cell: 5 },
      ],
    });
    game.rollDice();
    const kill = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 2)!;
    game.apply(kill);
    const walk = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 3)!;
    expect(eventTypes(game.apply(walk))).not.toContain('turnEnded');

    game.rollDice();
    expect(eventTypes(spendAll(game))).toContain('turnEnded');
    expect(game.playerIndex).toBe(1);
  });

  it('the turn moves on by ascending index and wraps to zero', () => {
    const game = setupGame({ rolls: [[1, 2], [1, 2], [1, 2], [1, 2]] });

    const order = [game.playerIndex];
    for (let index = 0; index < 4; index += 1) {
      game.rollDice();
      order.push(game.playerIndex);
    }

    expect(order).toEqual([0, 1, 2, 3, 0]);
  });
});

describe('session dice ledger', () => {
  it('spends one die per move and both dice for the sum', () => {
    const game = setupGame({ rolls: [[3, 4]], pawns: [{ player: 0, pawn: 0, cell: 3 }] });
    game.rollDice();

    const single = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 3)!;
    game.apply(single);
    expect(game.remainingDice).toEqual([4]);

    const rest = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 4)!;
    game.apply(rest);
    expect(game.remainingDice).toEqual([]);
    expect(game.board.position.cellOf(0, 0)).toBe(10);
  });

  it('a sum move consumes both dice', () => {
    const game = setupGame({ rolls: [[3, 4]], pawns: [{ player: 0, pawn: 0, cell: 3 }] });
    game.rollDice();

    const sum = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 7)!;
    game.apply(sum);

    expect(game.remainingDice).toEqual([]);
    expect(game.board.position.cellOf(0, 0)).toBe(10);
  });

  it('ends the turn when no legal move is left with the remaining dice', () => {
    const game = setupGame({
      rolls: [[3, 4]],
      pawns: [
        { player: 0, pawn: 0, cell: 3 },
        { player: 0, pawn: 1, cell: 28 },
        { player: 0, pawn: 2, cell: 29 },
        { player: 0, pawn: 3, cell: 30 },
        { player: 1, pawn: 0, cell: 8 },
      ],
    });
    game.rollDice();

    const three = game.legalMoves().find((move): move is StepMove => move.kind === 'step' && move.steps === 3)!;
    const events = game.apply(three);

    expect(eventTypes(events)).toContain('turnEnded');
    expect(game.remainingDice).toEqual([]);
    expect(game.playerIndex).toBe(1);
  });

  it('refuses a move that is not in the legal list of the ledger', () => {
    const game = setupGame({ rolls: [[3, 4]], pawns: [{ player: 0, pawn: 0, cell: 3 }] });
    game.rollDice();
    const move = game.legalMoves().find((candidate): candidate is StepMove => candidate.kind === 'step' && candidate.steps === 3)!;

    game.apply(move);

    expect(game.apply(move)).toEqual([{ type: 'moveRejected', reason: 'move is not in the legal list' }]);
    expect(game.apply({ ...move, playerIndex: 1 })).toEqual([
      { type: 'moveRejected', reason: 'move is not in the legal list' },
    ]);
  });

  it('never lets the same die be spent twice', () => {
    const game = setupGame({ rolls: [[3]], config: { ...defaultConfigWithOneDie() }, pawns: [{ player: 0, pawn: 0, cell: 3 }] });
    game.rollDice();

    const move = game.legalMoves()[0];
    game.apply(move);

    expect(game.remainingDice).toEqual([]);
    expect(game.legalMoves()).toEqual([]);
  });
});

function defaultConfigWithOneDie() {
  return { sideLength: 8, numberOfPlayers: 4, numberOfPawns: 4, numberOfDice: 1, numberOfSidesOnDice: 6, maxTurns: 10000 };
}

function spendAll(game: Game): GameEvent[] {
  const events: GameEvent[] = [];
  while (game.remainingDice.length > 0 && game.legalMoves().length > 0) {
    events.push(...game.apply(game.legalMoves()[0]));
  }
  return events;
}
