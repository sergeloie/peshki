import { BotStrategy } from '../ai/BotStrategy';
import { Board } from './Board';
import type { GameConfig } from './GameConfig';
import type { GameEvent } from './events/GameEvent';
import type { Move } from './Move';
import { MoveCommand } from './MoveCommand';
import { Pawn, PawnState } from './Pawn';
import type { Player } from './Player';

export class GameEngine {
  private readonly _config: GameConfig;
  private readonly _board: Board;
  private readonly _eventLog: GameEvent[] = [];
  private _currentPlayerIndex = 0;
  private _turnNumber = 0;
  private _currentDice: number[] = [];
  private readonly _botStrategy = new BotStrategy();

  constructor(config: GameConfig) {
    this._config = config;
    this._board = new Board(config);
    this._board.players[0].isHuman = true;
  }

  get board(): Board { return this._board; }
  get config(): GameConfig { return this._config; }
  get turnNumber(): number { return this._turnNumber; }
  get currentPlayerIndex(): number { return this._currentPlayerIndex; }
  get currentDice(): number[] { return this._currentDice; }
  get eventLog(): GameEvent[] { return [...this._eventLog]; }

  advancePlayer(extraTurn: boolean): void {
    if (!extraTurn && !this.isGameOver()) {
      this._currentPlayerIndex = (this._currentPlayerIndex + 1) % this._board.players.length;
    }
  }

  incrementTurn(): void {
    this._turnNumber++;
  }

  rollDice(): number[] {
    const player = this._board.players[this._currentPlayerIndex];
    this._currentDice = player.rollDice(this._config);
    return this._currentDice;
  }

  isGameOver(): boolean {
    return this._board.players.some(p => this.hasWon(p));
  }

  private hasWon(player: Player): boolean {
    const homeCount = player.getPawnsByState(PawnState.HOMER).length;
    if (homeCount !== this._config.numberOfPawns - 1) return false;

    const lastPawn = player.pawns.find(p => p.state !== PawnState.HOMER);
    if (!lastPawn) return false;
    if (lastPawn.state === PawnState.BENCH || lastPawn.state === PawnState.NEWBORN) return false;

    return lastPawn.cell === this._board.getCorner(player);
  }

  executeBotTurn(): GameEvent[] {
    if (this._turnNumber >= this._config.maxTurns) return [];

    this._turnNumber++;
    const events: GameEvent[] = [];

    const player = this._board.players[this._currentPlayerIndex];
    const dice = this._currentDice;

    const extraTurn = this.executeBotMoves(player, dice, events);

    this.renumberAll();

    events.push({ type: 'TurnEnded', playerNumber: player.number, extraTurn });

    if (this.isGameOver()) {
      events.push({ type: 'GameWon', playerNumber: player.number });
    } else if (!extraTurn) {
      this._currentPlayerIndex = (this._currentPlayerIndex + 1) % this._board.players.length;
    }

    this._eventLog.push(...events);
    return events;
  }

  executeHumanCommand(command: MoveCommand, usedDice: number[]): GameEvent[] {
    const events: GameEvent[] = [];
    const player = this._board.players[this._currentPlayerIndex];

    switch (command.type) {
      case 'PlacePawn':
        this.executePlacePawn(player, command.diceValue, events);
        break;
      case 'MovePawn':
        this.executeMovePawn(player, command.pawnNumber, command.steps, events);
        break;
      case 'PlaceAndMove':
        this.executePlacePawn(player, command.placeDice, events);
        this.executeMovePawn(player, this.findNewbornPawnNumber(player), command.moveDice, events);
        break;
    }

    this.renumberAll();
    return events;
  }

  private findNewbornPawnNumber(player: Player): number {
    return player.pawns
      .find(p => p.state === PawnState.NEWBORN && p.cell === this._board.getCorner(player))
      ?.number ?? 1;
  }

  private executePlacePawn(player: Player, diceValue: number, events: GameEvent[]): void {
    const cornerCell = this._board.getCorner(player);
    const existingPawn = cornerCell.pawn;

    if (existingPawn !== null && existingPawn.player === player) return;

    const benchPawns = player.getPawnsByState(PawnState.BENCH);
    if (benchPawns.length === 0) return;

    if (existingPawn !== null) {
      existingPawn.remove();
    }

    const pawn = benchPawns[0];
    cornerCell.pawn = pawn;
    pawn.cell = cornerCell;
    pawn.state = PawnState.NEWBORN;
    events.push({ type: 'PawnPlaced', playerNumber: player.number, pawnNumber: pawn.number, cellIndex: 0 });
  }

  private executeMovePawn(player: Player, pawnNumber: number, steps: number, events: GameEvent[]): void {
    const pawn = player.pawns.find(p => p.number === pawnNumber);
    if (!pawn || pawn.state === PawnState.BENCH) return;

    const target = pawn.findTargetCell(steps, this._config);
    if (target === null) return;

    const fromIndex = this.cellIndex(pawn);

    if (pawn.state !== PawnState.HOMER
      && target.pawn !== null
      && target.pawn.player !== player) {
      const victim = target.pawn;
      events.push({
        type: 'PawnKilled',
        killerPlayer: player.number, killerPawn: pawn.number,
        victimPlayer: victim.player.number, victimPawn: victim.number,
      });
      victim.remove();
    }

    pawn.moveTo(target);

    events.push({
      type: 'PawnMoved',
      playerNumber: player.number, pawnNumber: pawn.number,
      fromCell: fromIndex, toCell: this.cellIndex(pawn), steps,
    });

    if (pawn.state === PawnState.HOMER) {
      events.push({ type: 'EnteredHome', playerNumber: player.number, pawnNumber: pawn.number });
    }
  }

  private executeBotMoves(player: Player, dice: number[], events: GameEvent[]): boolean {
    let kickedEnemy = false;
    const remainingDice = [...dice];

    while (remainingDice.length > 0) {
      const availableMoves = GameEngine.generateAllMoves(player, remainingDice, this._board, this._config);
      if (availableMoves.length === 0) break;

      const bestMove = this._botStrategy.selectBestMove(player, availableMoves, this._config);
      if (!bestMove) break;

      if (bestMove.pawn === null) {
        this.executePlacePawn(player, 6, events);
      } else {
        const target = bestMove.pawn.findTargetCell(bestMove.steps, this._config);
        if (!target) break;

        const fromIndex = this.cellIndex(bestMove.pawn);

        if (bestMove.pawn.state !== PawnState.HOMER
          && target.pawn !== null
          && target.pawn.player !== player) {
          const victim = target.pawn;
          events.push({
            type: 'PawnKilled',
            killerPlayer: player.number, killerPawn: bestMove.pawn.number,
            victimPlayer: victim.player.number, victimPawn: victim.number,
          });
          victim.remove();
          kickedEnemy = true;
        }

        bestMove.pawn.moveTo(target);

        events.push({
          type: 'PawnMoved',
          playerNumber: player.number, pawnNumber: bestMove.pawn.number,
          fromCell: fromIndex, toCell: this.cellIndex(bestMove.pawn), steps: bestMove.steps,
        });

        if (bestMove.pawn.state === PawnState.HOMER) {
          events.push({ type: 'EnteredHome', playerNumber: player.number, pawnNumber: bestMove.pawn.number });
        }
      }

      for (const d of bestMove.consumedDice) {
        const idx = remainingDice.indexOf(d);
        if (idx !== -1) remainingDice.splice(idx, 1);
      }

      if (this.isGameOver()) break;
    }

    return kickedEnemy;
  }

  static generateAllMoves(player: Player, dice: number[], board: Board, config: GameConfig): Move[] {
    const moves: Move[] = [];
    const movablePawns = player.getMovablePawns();

    for (const dieValue of dice) {
      for (const pawn of movablePawns) {
        const target = pawn.findTargetCell(dieValue, config);
        if (target !== null) {
          moves.push({ pawn, steps: dieValue, consumedDice: [dieValue] });
        }
      }
    }

    if (dice.length === 2) {
      const sum = dice[0] + dice[1];
      for (const pawn of movablePawns) {
        const target = pawn.findTargetCell(sum, config);
        if (target !== null) {
          moves.push({ pawn, steps: sum, consumedDice: [...dice] });
        }
      }
    }

    if (dice.includes(6) && player.getPawnsByState(PawnState.BENCH).length > 0) {
      const cornerCell = board.getCorner(player);
      const existingPawn = cornerCell.pawn;
      if (existingPawn === null || existingPawn.player !== player) {
        moves.push({ pawn: null, steps: 0, consumedDice: [6] });

        const otherDice = dice.filter(d => d !== 6);
        for (const dieValue of otherDice) {
          if (GameEngine.canPlaceAndMove(player, dieValue, board, config)) {
            moves.push({ pawn: null, steps: dieValue, consumedDice: [6, dieValue] });
          }
        }
      }
    }

    return moves;
  }

  private static canPlaceAndMove(player: Player, steps: number, board: Board, config: GameConfig): boolean {
    let current = board.getCorner(player);
    for (let i = 0; i < steps; i++) {
      const next = current.nextFieldCell;
      if (next === null) return false;
      if (i < steps - 1 && next.pawn !== null) return false;
      if (i === steps - 1 && next.pawn !== null
        && next.pawn.player === player) return false;
      current = next;
    }
    return true;
  }

  private renumberAll(): void {
    this._board.players.forEach(p => p.renumber());
  }

  private cellIndex(pawn: Pawn): number {
    if (pawn.cell === null) return -1;
    const allCells = this._board.getAllCells();
    for (let i = 0; i < allCells.length; i++) {
      if (allCells[i] === pawn.cell) return i;
    }
    return -1;
  }
}
