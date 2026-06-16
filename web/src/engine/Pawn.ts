import { Cell, CellType } from './Cell';
import type { GameConfig } from './GameConfig';
import type { Player } from './Player';

export enum PawnState {
  BENCH = 'BENCH',
  NEWBORN = 'NEWBORN',
  FIELDER = 'FIELDER',
  HOMER = 'HOMER',
}

export class Pawn {
  private _number: number;
  private _cell: Cell | null = null;
  private _state: PawnState = PawnState.BENCH;

  constructor(
    private readonly _player: Player,
    number: number,
  ) {
    this._number = number;
  }

  get player(): Player {
    return this._player;
  }

  get number(): number {
    return this._number;
  }

  set number(value: number) {
    this._number = value;
  }

  get cell(): Cell | null {
    return this._cell;
  }

  set cell(value: Cell | null) {
    this._cell = value;
  }

  get state(): PawnState {
    return this._state;
  }

  set state(value: PawnState) {
    this._state = value;
  }

  findTargetCell(steps: number, config: GameConfig): Cell | null {
    let current = this._cell!;
    const corner = this._player.corner;
    const inHome = this._state === PawnState.HOMER;
    const isLastLapPawn = !inHome
      && this._player.getPawnsByState(PawnState.HOMER).length === config.numberOfPawns - 1;

    let currentInHome = inHome;

    for (let i = 0; i < steps; i++) {
      let next: Cell | null = null;

      if (!currentInHome) {
        if (current === corner && this._state === PawnState.FIELDER) {
          if (isLastLapPawn) {
            return i === steps - 1 ? corner : null;
          }
          currentInHome = true;
          next = current.nextHomeCell;
        } else {
          next = current.nextFieldCell;
          if (next === corner) {
            if (isLastLapPawn) {
              return i === steps - 1 ? corner : null;
            }
            currentInHome = true;
          }
        }
      } else {
        next = current.nextHomeCell;
      }

      if (next === null) return null;

      if (i < steps - 1 && next.pawn !== null) return null;

      if (i === steps - 1 && next.pawn !== null
        && next.pawn.player === this._player) return null;

      current = next;
    }

    return current;
  }

  moveTo(targetCell: Cell): void {
    if (this._cell !== null) {
      this._cell.pawn = null;
    }
    targetCell.pawn = this;
    this._cell = targetCell;

    if (this._state === PawnState.NEWBORN) {
      this._state = PawnState.FIELDER;
    }
    if (this._state === PawnState.FIELDER && targetCell.cellType === CellType.HOME) {
      this._state = PawnState.HOMER;
    }
  }

  remove(): void {
    if (this._state === PawnState.HOMER) {
      throw new Error('Cannot remove pawn in home');
    }
    if (this._state === PawnState.BENCH) {
      throw new Error('Pawn already on bench');
    }
    this._cell!.pawn = null;
    this._cell = null;
    this._state = PawnState.BENCH;
  }
}
