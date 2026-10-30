import type { GameConfig } from './config';
import type { BoardTopology } from './topology';

export type CellType = 'corner' | 'field' | 'home';

export interface Cell {
  readonly index: number;
  readonly type: CellType;
  readonly owner: number | null;
}

export function buildCells(config: GameConfig, topology: BoardTopology): Cell[] {
  const cells: Cell[] = Array.from({ length: topology.totalCells }, (_, index) => ({ index, type: 'field', owner: null }));

  for (let player = 0; player < config.numberOfPlayers; player += 1) {
    const corner = topology.cornerRingIndex(player);
    cells[corner] = { index: corner, type: 'corner', owner: player };
    for (let step = 0; step < topology.homeLength; step += 1) {
      const index = topology.homeCellIndex(player, step);
      cells[index] = { index, type: 'home', owner: player };
    }
  }

  return cells;
}
