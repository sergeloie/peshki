import type { GameConfig } from './config';
import { DEFAULT_CONFIG, validateConfig } from './config';
import { Board } from './board';
import type { GameEvent } from './events';
import type { Move } from './moves';
import { generateMoves, moveKey } from './moves';
import { applyMove } from './apply';
import { hasWon } from './win';
import { grantsExtraTurn } from './turn-policy';
import type { MoveSelector } from './selectors';
import { firstLegalMove } from './selectors';

export interface GameOptions {
  config?: GameConfig;
  /** Seat that rolls first. */
  playerIndex?: number;
  /** Seat played by the UI; every other seat is driven by a selector. */
  humanPlayerIndex?: number;
  random?: () => number;
}

/** Guards a caller bug from turning into an endless loop. */
const MAX_STEPS_PER_TURN = 64;

/**
 * One whole game: turn ownership, the dice ledger, win and draw detection.
 * The UI and the bots both drive it through {@link apply} (ADR-0001).
 */
export class Game {
  readonly config: GameConfig;
  readonly board: Board;
  readonly human: boolean[];
  playerIndex: number;
  rolledDice: number[] = [];
  remainingDice: number[] = [];
  turnNumber = 0;
  gameOver = false;
  /** -1 until somebody wins; a finished game with -1 is a draw. */
  winnerPlayerIndex = -1;
  private killedThisTurn = false;
  private extraRollUsed = false;
  private readonly random: () => number;

  constructor(options: GameOptions = {}) {
    this.config = options.config ?? DEFAULT_CONFIG;
    validateConfig(this.config);
    this.playerIndex = options.playerIndex ?? 0;
    this.human = Array.from({ length: this.config.numberOfPlayers }, (_, index) => index === (options.humanPlayerIndex ?? 0));
    this.random = options.random ?? Math.random;
    this.board = new Board(this.config);
  }

  get result(): 'playing' | 'won' | 'draw' {
    if (!this.gameOver) return 'playing';
    return this.winnerPlayerIndex < 0 ? 'draw' : 'won';
  }

  isHuman(playerIndex: number): boolean {
    return this.human[playerIndex] ?? false;
  }

  rollDice(): GameEvent[] {
    if (this.gameOver) return [rejected('game is over')];
    if (this.remainingDice.length > 0) return [rejected('unspent dice remain')];

    const values = Array.from({ length: this.config.numberOfDice }, () =>
      Math.floor(this.random() * this.config.numberOfSidesOnDice) + 1,
    );
    this.rolledDice.splice(0, this.rolledDice.length, ...values);
    this.remainingDice.splice(0, this.remainingDice.length, ...values);
    const events: GameEvent[] = [{ type: 'diceRolled', playerIndex: this.playerIndex, values }];
    if (this.legalMoves().length === 0) events.push(...this.endCycle());
    return events;
  }

  /** Legal moves for the current seat with the dice still unspent. */
  legalMoves(): Move[] {
    if (this.gameOver) return [];
    return generateMoves(this.board, this.playerIndex, this.remainingDice);
  }

  /** Ends the roll cycle when no legal move exists (RULES.MD §10.1, step 2). */
  pass(): GameEvent[] {
    if (this.gameOver) return [rejected('game is over')];
    if (this.legalMoves().length > 0) return [rejected('legal moves are available')];
    return this.endCycle();
  }

  apply(move: Move): GameEvent[] {
    if (this.gameOver) return [rejected('game is over')];

    const legal = this.legalMoves().find((candidate) => moveKey(candidate) === moveKey(move));
    if (legal === undefined) return [rejected('move is not in the legal list')];

    const events = applyMove(this.board, legal);
    if (events.some((event) => event.type === 'moveRejected')) return events;

    for (const value of legal.consumedDice) {
      const index = this.remainingDice.indexOf(value);
      if (index >= 0) this.remainingDice.splice(index, 1);
    }
    if (events.some((event) => event.type === 'pawnKilled')) this.killedThisTurn = true;

    if (this.checkWin()) events.push(...this.finishWin());
    else if (this.remainingDice.length === 0 || this.legalMoves().length === 0) events.push(...this.endCycle());
    return events;
  }

  /**
   * Plays the whole turn of the seat that is on move, through the single apply
   * path. The human seat is driven by the UI instead.
   */
  playSeatTurn(selector: MoveSelector = firstLegalMove): GameEvent[] {
    const seat = this.playerIndex;
    const events: GameEvent[] = [];
    for (let step = 0; step < MAX_STEPS_PER_TURN; step += 1) {
      if (this.gameOver || this.playerIndex !== seat) break;
      if (this.remainingDice.length === 0) {
        events.push(...this.rollDice());
        continue;
      }
      const legal = this.legalMoves();
      if (legal.length === 0) {
        events.push(...this.pass());
        continue;
      }
      events.push(...this.apply(selector(legal) ?? legal[0]));
    }
    return events;
  }

  private checkWin(): boolean {
    for (let playerIndex = 0; playerIndex < this.config.numberOfPlayers; playerIndex += 1) {
      if (hasWon(this.board, playerIndex)) {
        this.winnerPlayerIndex = playerIndex;
        return true;
      }
    }
    return false;
  }

  private finishWin(): GameEvent[] {
    this.gameOver = true;
    this.remainingDice.splice(0, this.remainingDice.length);
    return [{ type: 'gameWon', playerIndex: this.winnerPlayerIndex }];
  }

  /** Spends the rest of the roll: one extra roll for the same seat, or the turn ends. */
  private endCycle(): GameEvent[] {
    this.remainingDice.splice(0, this.remainingDice.length);
    this.turnNumber += 1;

    if (!this.extraRollUsed && grantsExtraTurn(this.rolledDice, this.killedThisTurn)) {
      this.extraRollUsed = true;
      return [];
    }

    const events: GameEvent[] = [{ type: 'turnEnded', playerIndex: this.playerIndex }];
    if (this.turnNumber >= this.config.maxTurns) {
      this.gameOver = true;
      events.push({ type: 'gameDrawn', turnNumber: this.turnNumber });
      return events;
    }

    this.extraRollUsed = false;
    this.killedThisTurn = false;
    this.playerIndex = (this.playerIndex + 1) % this.config.numberOfPlayers;
    return events;
  }
}

function rejected(reason: string): GameEvent {
  return { type: 'moveRejected', reason };
}
