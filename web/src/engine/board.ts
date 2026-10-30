import type { GameConfig } from './config';
import { DEFAULT_CONFIG } from './config';
import { BoardTopology } from './topology';
import type { Cell } from './cells';
import { buildCells } from './cells';
import { Position } from './position';
import { findTarget, tracePath } from './target-search';

export type PawnState = 'BENCH' | 'NEWBORN' | 'FIELDER' | 'HOMER';

export class Board {
  readonly config: GameConfig;
  readonly topology: BoardTopology;
  readonly cells: Cell[];
  position: Position;

  constructor(config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.topology = new BoardTopology(config);
    this.cells = buildCells(config, this.topology);
    this.position = new Position(config, this.topology);
  }

  /** Copy for lookahead; the topology and cells are immutable, only the position moves. */
  clone(): Board {
    const copy = new Board(this.config);
    copy.position = this.position.clone();
    return copy;
  }

  cell(cellIndex: number): Cell {
    return this.cells[cellIndex];
  }

  cornerCell(playerIndex: number): number {
    return this.topology.cornerRingIndex(playerIndex);
  }

  occupantAt(cellIndex: number) {
    return this.position.occupantAt(cellIndex);
  }

  isBench(playerIndex: number, pawnIndex: number): boolean {
    return this.position.isBench(playerIndex, pawnIndex);
  }

  isNewborn(playerIndex: number, pawnIndex: number): boolean {
    return this.position.isNewborn(playerIndex, pawnIndex);
  }

  isHome(playerIndex: number, pawnIndex: number): boolean {
    return this.position.isHome(playerIndex, pawnIndex);
  }

  isFielder(playerIndex: number, pawnIndex: number): boolean {
    return !this.isBench(playerIndex, pawnIndex) && !this.isNewborn(playerIndex, pawnIndex) && !this.isHome(playerIndex, pawnIndex);
  }

  pawnState(playerIndex: number, pawnIndex: number): PawnState {
    if (this.isBench(playerIndex, pawnIndex)) return 'BENCH';
    if (this.isNewborn(playerIndex, pawnIndex)) return 'NEWBORN';
    if (this.isHome(playerIndex, pawnIndex)) return 'HOMER';
    return 'FIELDER';
  }

  countHome(playerIndex: number): number {
    return this.position.countHome(playerIndex);
  }

  movablePawns(playerIndex: number): number[] {
    return Array.from({ length: this.config.numberOfPawns }, (_, pawnIndex) => pawnIndex).filter(
      (pawnIndex) => !this.isBench(playerIndex, pawnIndex),
    );
  }

  benchPawns(playerIndex: number): number[] {
    return Array.from({ length: this.config.numberOfPawns }, (_, pawnIndex) => pawnIndex).filter((pawnIndex) =>
      this.isBench(playerIndex, pawnIndex),
    );
  }

  findTarget(playerIndex: number, pawnIndex: number, steps: number): number | null {
    const start = this.position.cellOf(playerIndex, pawnIndex);
    return findTarget(
      this.topology,
      this.position,
      playerIndex,
      start,
      steps,
      !this.isNewborn(playerIndex, pawnIndex),
    );
  }

  findTargetFromCorner(playerIndex: number, steps: number): number | null {
    return findTarget(this.topology, this.position, playerIndex, this.cornerCell(playerIndex), steps, false);
  }

  stepPath(playerIndex: number, pawnIndex: number, steps: number): number[] | null {
    const start = this.position.cellOf(playerIndex, pawnIndex);
    return tracePath(
      this.topology,
      this.position,
      playerIndex,
      start,
      steps,
      !this.isNewborn(playerIndex, pawnIndex),
    );
  }

  pathFromCorner(playerIndex: number, steps: number): number[] | null {
    return tracePath(this.topology, this.position, playerIndex, this.cornerCell(playerIndex), steps, false);
  }

  movePawn(playerIndex: number, pawnIndex: number, cellIndex: number): void {
    this.position.move(playerIndex, pawnIndex, cellIndex);
  }

  placePawn(playerIndex: number, pawnIndex: number, cellIndex: number): void {
    this.position.place(playerIndex, pawnIndex, cellIndex);
  }

  capturePawn(playerIndex: number, pawnIndex: number): void {
    this.position.capture(playerIndex, pawnIndex);
  }

  /** Display-only closeness to home (RULES.MD §12); higher is closer. */
  pawnProgress(playerIndex: number, pawnIndex: number): number {
    if (this.isBench(playerIndex, pawnIndex)) return -2;
    if (this.isNewborn(playerIndex, pawnIndex)) return -1;
    const cell = this.position.cellOf(playerIndex, pawnIndex);
    if (this.topology.isHomeCellIndex(cell)) return 1000 + this.topology.homeStep(playerIndex, cell);
    const ring = this.topology.ringLength;
    return (cell - this.cornerCell(playerIndex) - 1 + ring) % ring;
  }

  /** Pawn indices ordered as display numbers #1..#N (highest progress first). */
  displayNumbers(playerIndex: number): number[] {
    return Array.from({ length: this.config.numberOfPawns }, (_, pawnIndex) => pawnIndex).sort((a, b) => {
      const byProgress = this.pawnProgress(playerIndex, b) - this.pawnProgress(playerIndex, a);
      return byProgress !== 0 ? byProgress : a - b;
    });
  }
}
