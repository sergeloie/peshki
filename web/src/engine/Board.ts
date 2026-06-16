import { Cell, CellType } from './Cell';
import type { GameConfig } from './GameConfig';
import { Player } from './Player';

export class Board {
  private readonly _players: Player[];
  private readonly _corners: Map<Player, Cell>;

  constructor(config: GameConfig) {
    this._players = Array.from({ length: config.numberOfPlayers },
      (_, i) => new Player(i + 1, config));
    this._corners = this.generateCorners();
    this.generateHomeCells(config);
    this.generateFieldCells(config);
  }

  get players(): Player[] {
    return this._players;
  }

  getCorner(player: Player): Cell {
    return this._corners.get(player)!;
  }

  getAllCells(): Cell[] {
    const cells: Cell[] = [];

    const firstPlayer = [...this._corners.keys()]
      .reduce((min, p) => p.number < min.number ? p : min);
    const corner = this._corners.get(firstPlayer)!;
    let current = corner;
    do {
      cells.push(current);
      current = current.nextFieldCell!;
    } while (current !== corner);

    for (const player of this._players) {
      let home = this._corners.get(player)!.nextHomeCell;
      while (home !== null) {
        cells.push(home);
        home = home.nextHomeCell;
      }
    }

    return cells;
  }

  private generateCorners(): Map<Player, Cell> {
    const corners = new Map<Player, Cell>();
    for (const player of this._players) {
      const corner = new Cell(CellType.CORNER, player);
      player.corner = corner;
      corners.set(player, corner);
    }
    return corners;
  }

  private generateHomeCells(config: GameConfig): void {
    for (const [player, corner] of this._corners) {
      let prev = corner;
      for (let i = 1; i < config.numberOfPawns; i++) {
        const cell = new Cell(CellType.HOME, player);
        prev.nextHomeCell = cell;
        prev = cell;
      }
    }
  }

  private generateFieldCells(config: GameConfig): void {
    const cornerCells = [...this._corners.values()]
      .sort((a, b) => a.owner!.number - b.owner!.number);

    for (let i = 0; i < cornerCells.length; i++) {
      let prev = cornerCells[i];
      for (let j = 1; j <= config.sideLength - 2; j++) {
        const cell = new Cell(CellType.FIELD);
        prev.nextFieldCell = cell;
        prev = cell;
      }
      prev.nextFieldCell = cornerCells[(i + 1) % cornerCells.length];
    }
  }
}
