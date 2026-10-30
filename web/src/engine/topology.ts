import type { GameConfig, DerivedConfig } from './config';
import { derive } from './config';

/** Index arithmetic over the cell layout: ring first, then one home tail per player. */
export class BoardTopology {
  readonly config: GameConfig;
  readonly derived: DerivedConfig;
  readonly ringLength: number;
  readonly homeLength: number;
  readonly totalCells: number;
  private readonly segmentLength: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.derived = derive(config);
    this.ringLength = this.derived.ringLength;
    this.homeLength = this.derived.homeLength;
    this.totalCells = this.derived.totalCells;
    this.segmentLength = config.sideLength - 1;
  }

  cornerRingIndex(playerIndex: number): number {
    return playerIndex * this.segmentLength;
  }

  isCornerRingIndex(cellIndex: number): boolean {
    return cellIndex >= 0 && cellIndex < this.ringLength && cellIndex % this.segmentLength === 0;
  }

  cornerOwner(cellIndex: number): number {
    if (!this.isCornerRingIndex(cellIndex)) throw new RangeError(`Not a corner: ${cellIndex}`);
    return cellIndex / this.segmentLength;
  }

  nextRingIndex(cellIndex: number): number {
    return (cellIndex + 1) % this.ringLength;
  }

  homeCellIndex(playerIndex: number, homeStep: number): number {
    if (homeStep < 0 || homeStep >= this.homeLength) throw new RangeError(`Home step out of range: ${homeStep}`);
    return this.ringLength + playerIndex * this.homeLength + homeStep;
  }

  isHomeCellIndex(cellIndex: number): boolean {
    return cellIndex >= this.ringLength && cellIndex < this.totalCells;
  }

  homeStep(playerIndex: number, cellIndex: number): number {
    const step = cellIndex - (this.ringLength + playerIndex * this.homeLength);
    if (step < 0 || step >= this.homeLength) throw new RangeError(`Cell ${cellIndex} is not home of player ${playerIndex}`);
    return step;
  }

  isRingCellIndex(cellIndex: number): boolean {
    return cellIndex >= 0 && cellIndex < this.ringLength;
  }
}
