import { Cell } from './Cell';
import type { GameConfig } from './GameConfig';
import { Pawn, PawnState } from './Pawn';

export class Player {
  private readonly _pawns: Pawn[];
  private _corner!: Cell;
  private _human = false;

  constructor(
    private readonly _number: number,
    config: GameConfig,
  ) {
    this._pawns = Array.from({ length: config.numberOfPawns }, (_, i) => new Pawn(this, i + 1));
  }

  get number(): number {
    return this._number;
  }

  get pawns(): Pawn[] {
    return this._pawns;
  }

  get corner(): Cell {
    return this._corner;
  }

  set corner(cell: Cell) {
    this._corner = cell;
  }

  get isHuman(): boolean {
    return this._human;
  }

  set isHuman(value: boolean) {
    this._human = value;
  }

  rollDice(config: GameConfig): number[] {
    return Array.from({ length: config.numberOfDice },
      () => Math.floor(Math.random() * config.numberOfSidesOnDice) + 1);
  }

  getPawnsByState(...states: PawnState[]): Pawn[] {
    return this._pawns.filter(p => states.includes(p.state));
  }

  getMovablePawns(): Pawn[] {
    return this.getPawnsByState(PawnState.NEWBORN, PawnState.FIELDER, PawnState.HOMER);
  }

  renumber(): void {
    const sorted = [...this._pawns].sort((a, b) => this.getProgress(b) - this.getProgress(a));
    sorted.forEach((p, i) => {
      p.number = i + 1;
    });
  }

  private getProgress(pawn: Pawn): number {
    switch (pawn.state) {
      case PawnState.HOMER:
        return 1000 + this.getHomePosition(pawn);
      case PawnState.FIELDER:
        return this.getFieldPosition(pawn);
      case PawnState.NEWBORN:
        return -1;
      case PawnState.BENCH:
        return -2;
    }
  }

  private getFieldPosition(pawn: Pawn): number {
    let current = this._corner.nextFieldCell!;
    let pos = 0;
    while (current !== this._corner && pos < 100) {
      if (current === pawn.cell) return pos;
      current = current.nextFieldCell!;
      pos++;
    }
    return -1;
  }

  private getHomePosition(pawn: Pawn): number {
    let current = this._corner.nextHomeCell;
    let pos = 0;
    while (current !== null) {
      if (current === pawn.cell) return pos;
      current = current.nextHomeCell;
      pos++;
    }
    return -1;
  }
}
