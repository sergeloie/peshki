import type { Player } from './Player';
import type { Pawn } from './Pawn';

export enum CellType {
  CORNER = 'CORNER',
  FIELD = 'FIELD',
  HOME = 'HOME',
}

export class Cell {
  private _nextFieldCell: Cell | null = null;
  private _nextHomeCell: Cell | null = null;
  private _pawn: Pawn | null = null;

  constructor(
    private readonly _cellType: CellType,
    private readonly _owner: Player | null = null,
  ) {}

  get cellType(): CellType {
    return this._cellType;
  }

  get owner(): Player | null {
    return this._owner;
  }

  get nextFieldCell(): Cell | null {
    return this._nextFieldCell;
  }

  set nextFieldCell(cell: Cell | null) {
    this._nextFieldCell = cell;
  }

  get nextHomeCell(): Cell | null {
    return this._nextHomeCell;
  }

  set nextHomeCell(cell: Cell | null) {
    this._nextHomeCell = cell;
  }

  get pawn(): Pawn | null {
    return this._pawn;
  }

  set pawn(pawn: Pawn | null) {
    this._pawn = pawn;
  }
}
