import type { BoardTopology } from './topology';
import type { Position } from './position';

/**
 * Normal walks from a start cell (RULES.MD §7). Returns the visited cells in
 * order, or null when the walk is illegal. `canEnterHome` is false for
 * newborns and for place-and-move previews.
 */
export function tracePath(
  topology: BoardTopology,
  position: Position,
  playerIndex: number,
  startCell: number,
  steps: number,
  canEnterHome: boolean,
): number[] | null {
  if (startCell < 0 || steps < 1) return null;

  const corner = topology.cornerRingIndex(playerIndex);
  let inHome = topology.isHomeCellIndex(startCell);
  const lastLap = !inHome && position.countHome(playerIndex) === topology.config.numberOfPawns - 1;
  let current = startCell;
  const path: number[] = [];

  for (let i = 0; i < steps; i += 1) {
    const last = i === steps - 1;
    let next: number;

    if (!inHome) {
      if (current === corner && canEnterHome) {
        if (lastLap) return last ? appendCorner(path, corner) : null;
        inHome = true;
        next = topology.homeCellIndex(playerIndex, 0);
      } else {
        next = topology.nextRingIndex(current);
        if (next === corner) {
          if (lastLap) return last ? [...path, corner] : null;
          inHome = true;
        }
      }
    } else if (current === corner) {
      next = topology.homeCellIndex(playerIndex, 0);
    } else {
      const step = topology.homeStep(playerIndex, current);
      if (step + 1 >= topology.homeLength) return null;
      next = topology.homeCellIndex(playerIndex, step + 1);
    }

    const occupant = position.occupantAt(next);
    if (!last && occupant !== null) return null;
    if (last && occupant !== null && occupant.playerIndex === playerIndex) return null;

    path.push(next);
    current = next;
  }

  return path;
}

export function findTarget(
  topology: BoardTopology,
  position: Position,
  playerIndex: number,
  startCell: number,
  steps: number,
  canEnterHome: boolean,
): number | null {
  const path = tracePath(topology, position, playerIndex, startCell, steps, canEnterHome);
  return path === null ? null : path[path.length - 1];
}

function appendCorner(path: number[], corner: number): number[] {
  return path.length > 0 && path[path.length - 1] === corner ? path : [...path, corner];
}
