import { describe, expect, it } from 'vitest';
import { Game, seededRandom } from '../../src/engine';
import type { StepMove } from '../../src/engine';

function fixedRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('Game dice and the single apply path', () => {
  it('rolls the configured number of dice from the injected RNG', () => {
    const game = new Game({ random: fixedRandom([0.4, 0.6]) });

    const events = game.rollDice();

    expect(events).toEqual([{ type: 'diceRolled', playerIndex: 0, values: [3, 4] }]);
    expect(game.remainingDice).toEqual([3, 4]);
  });

  it('refuses a second roll while dice remain', () => {
    const game = new Game({ random: fixedRandom([0.4, 0.6]) });
    game.rollDice();

    expect(game.rollDice()).toEqual([{ type: 'moveRejected', reason: 'unspent dice remain' }]);
  });

  it('spends the die and ends the turn when the last die is spent', () => {
    const game = new Game({ random: fixedRandom([0.4, 0.6]) });
    game.board.position.move(0, 0, 3);
    game.rollDice();
    const move = game.legalMoves().find((candidate): candidate is StepMove => candidate.kind === 'step' && candidate.steps === 4)!;

    const events = game.apply(move);

    expect(game.remainingDice).toEqual([3]);
    expect(events.map((event) => event.type)).toContain('pawnMoved');
    expect(events.map((event) => event.type)).not.toContain('turnEnded');
  });

  it('two rapid applications of the same move produce one move and one rejection', () => {
    const game = new Game({ random: fixedRandom([0.4, 0.6]) });
    game.board.position.move(0, 0, 3);
    game.rollDice();
    const move = game.legalMoves().find((candidate): candidate is StepMove => candidate.kind === 'step' && candidate.steps === 4)!;

    const first = game.apply(move);
    const second = game.apply(move);

    expect(first.filter((event) => event.type === 'pawnMoved')).toHaveLength(1);
    expect(second).toEqual([{ type: 'moveRejected', reason: 'move is not in the legal list' }]);
    expect(game.board.position.cellOf(0, 0)).toBe(7);
  });

  it('drops the dice when no legal move exists', () => {
    const game = new Game({ random: fixedRandom([0.4, 0.6]) });
    game.rollDice();

    expect(game.legalMoves()).toEqual([]);
    expect(game.pass()).toEqual([{ type: 'turnEnded', playerIndex: 0 }]);
    expect(game.remainingDice).toEqual([]);
  });

  it('refuses to pass while a legal move exists', () => {
    const game = new Game({ random: fixedRandom([0.9]) });
    game.rollDice();

    expect(game.pass()).toEqual([{ type: 'moveRejected', reason: 'legal moves are available' }]);
  });

  it('seededRandom is deterministic and stays in [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);

    for (let i = 0; i < 100; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
