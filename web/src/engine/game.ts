import type { GameConfig } from './config';
import { DEFAULT_CONFIG, validateConfig } from './config';
import { Board } from './board';
import type { GameEvent } from './events';
import type { Move } from './moves';
import { generateMoves, moveKey } from './moves';
import { applyMove } from './apply';

export interface GameOptions {
  config?: GameConfig;
  playerIndex?: number;
  random?: () => number;
}

/**
 * Dice + apply facade for one player. Turn alternation, extra turns, win
 * detection and persistence belong to ticket #4.
 */
export class Game {
  readonly config: GameConfig;
  readonly board: Board;
  readonly playerIndex: number;
  readonly rolledDice: number[] = [];
  readonly remainingDice: number[] = [];
  private readonly random: () => number;

  constructor(options: GameOptions = {}) {
    this.config = options.config ?? DEFAULT_CONFIG;
    validateConfig(this.config);
    this.playerIndex = options.playerIndex ?? 0;
    this.random = options.random ?? Math.random;
    this.board = new Board(this.config);
  }

  rollDice(): GameEvent[] {
    if (this.remainingDice.length > 0) return [{ type: 'moveRejected', reason: 'unspent dice remain' }];

    const values = Array.from({ length: this.config.numberOfDice }, () =>
      Math.floor(this.random() * this.config.numberOfSidesOnDice) + 1,
    );
    this.rolledDice.splice(0, this.rolledDice.length, ...values);
    this.remainingDice.splice(0, this.remainingDice.length, ...values);
    return [{ type: 'diceRolled', playerIndex: this.playerIndex, values }];
  }

  legalMoves(): Move[] {
    return generateMoves(this.board, this.playerIndex, this.remainingDice);
  }

  /** Drops the dice when no legal move exists (RULES.MD §10.1, step 2). */
  pass(): GameEvent[] {
    if (this.legalMoves().length > 0) return [{ type: 'moveRejected', reason: 'legal moves are available' }];
    this.remainingDice.splice(0, this.remainingDice.length);
    return [{ type: 'turnEnded', playerIndex: this.playerIndex }];
  }

  apply(move: Move): GameEvent[] {
    const legal = this.legalMoves().find((candidate) => moveKey(candidate) === moveKey(move));
    if (legal === undefined) return [{ type: 'moveRejected', reason: 'move is not in the legal list' }];

    const events = applyMove(this.board, legal);
    if (events.some((event) => event.type === 'moveRejected')) return events;

    for (const value of legal.consumedDice) {
      const index = this.remainingDice.indexOf(value);
      if (index >= 0) this.remainingDice.splice(index, 1);
    }
    if (this.remainingDice.length === 0) events.push({ type: 'turnEnded', playerIndex: this.playerIndex });
    return events;
  }
}
