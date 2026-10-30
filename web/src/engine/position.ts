import type { GameConfig } from './config';
import type { BoardTopology } from './topology';

export const BENCH_CELL = -1;

export interface PawnRef {
  readonly playerIndex: number;
  readonly pawnIndex: number;
}

/** Single source of truth for "who stands where"; carries no rules. */
export class Position {
  private readonly cell: number[][];
  private readonly moved: boolean[][];

  constructor(config: GameConfig, private readonly topology: BoardTopology) {
    this.cell = Array.from({ length: config.numberOfPlayers }, () =>
      Array.from({ length: config.numberOfPawns }, () => BENCH_CELL),
    );
    this.moved = Array.from({ length: config.numberOfPlayers }, () =>
      Array.from({ length: config.numberOfPawns }, () => false),
    );
  }

  cellOf(playerIndex: number, pawnIndex: number): number {
    return this.cell[playerIndex][pawnIndex];
  }

  hasMoved(playerIndex: number, pawnIndex: number): boolean {
    return this.moved[playerIndex][pawnIndex];
  }

  isBench(playerIndex: number, pawnIndex: number): boolean {
    return this.cell[playerIndex][pawnIndex] === BENCH_CELL;
  }

  isNewborn(playerIndex: number, pawnIndex: number): boolean {
    return !this.isBench(playerIndex, pawnIndex) && !this.moved[playerIndex][pawnIndex];
  }

  isHome(playerIndex: number, pawnIndex: number): boolean {
    if (this.isBench(playerIndex, pawnIndex)) return false;
    return this.topology.isHomeCellIndex(this.cell[playerIndex][pawnIndex]);
  }

  place(playerIndex: number, pawnIndex: number, cellIndex: number): void {
    this.cell[playerIndex][pawnIndex] = cellIndex;
    this.moved[playerIndex][pawnIndex] = false;
  }

  move(playerIndex: number, pawnIndex: number, cellIndex: number): void {
    this.cell[playerIndex][pawnIndex] = cellIndex;
    this.moved[playerIndex][pawnIndex] = true;
  }

  capture(playerIndex: number, pawnIndex: number): void {
    this.cell[playerIndex][pawnIndex] = BENCH_CELL;
    this.moved[playerIndex][pawnIndex] = false;
  }

  occupantAt(cellIndex: number): PawnRef | null {
    if (cellIndex < 0) return null;
    for (let playerIndex = 0; playerIndex < this.cell.length; playerIndex += 1) {
      for (let pawnIndex = 0; pawnIndex < this.cell[playerIndex].length; pawnIndex += 1) {
        if (this.cell[playerIndex][pawnIndex] === cellIndex) return { playerIndex, pawnIndex };
      }
    }
    return null;
  }

  countHome(playerIndex: number): number {
    let count = 0;
    for (let pawnIndex = 0; pawnIndex < this.cell[playerIndex].length; pawnIndex += 1) {
      if (this.isHome(playerIndex, pawnIndex)) count += 1;
    }
    return count;
  }
}
