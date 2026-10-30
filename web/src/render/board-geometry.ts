import { BoardTopology, DEFAULT_CONFIG } from '../engine';

export interface Point {
  x: number;
  y: number;
}

export const BOARD_DESIGN_SIZE = 1280;
export const RING_RADIUS = 480;
export const RING_CELL_SIZE = 124;
export const CORNER_CELL_SIZE = 132;
export const HOME_CELL_SIZES = [104, 96, 88] as const;

/** Visual N, E, S, W order — clockwise, matching docs/art-direction.md §4. */
const CORNERS: Point[] = [
  { x: 0, y: -RING_RADIUS },
  { x: RING_RADIUS, y: 0 },
  { x: 0, y: RING_RADIUS },
  { x: -RING_RADIUS, y: 0 },
];

const VERTICES: Point[] = [
  { x: RING_RADIUS, y: -RING_RADIUS },
  { x: RING_RADIUS, y: RING_RADIUS },
  { x: -RING_RADIUS, y: RING_RADIUS },
  { x: -RING_RADIUS, y: -RING_RADIUS },
];

// Engine corners 0..3 map to S, W, N, E so engine index 0 is the human sitting south.
export const ENGINE_CORNER_TO_VISUAL = [2, 3, 0, 1] as const;

const PITCH = (2 * RING_RADIUS) / 7;
const HOME_SHRINK = 0.23;
const BENCH_OFFSET = RING_RADIUS + 108;
const BENCH_GAP = 52;

export interface RingCellPosition {
  cellIndex: number;
  cornerPlayer: number | null;
  x: number;
  y: number;
  size: number;
}

export interface CornerPosition {
  playerIndex: number;
  visualCorner: number;
  x: number;
  y: number;
  size: number;
}

export interface HomeCellPosition {
  playerIndex: number;
  step: number;
  cellIndex: number;
  x: number;
  y: number;
  size: number;
}

export interface BenchSlot {
  playerIndex: number;
  pawnIndex: number;
  x: number;
  y: number;
}

export interface BoardGeometry {
  scale: number;
  center: Point;
  boardSide: number;
  cellSize: number;
  cornerSize: number;
  ring: RingCellPosition[];
  corners: CornerPosition[];
  homes: HomeCellPosition[][];
  benches: BenchSlot[][];
}

const topology = new BoardTopology(DEFAULT_CONFIG);

export function createBoardGeometry(width: number, height: number): BoardGeometry {
  const scale = (Math.min(width, height) * 0.92) / BOARD_DESIGN_SIZE;
  const center = { x: width / 2, y: height / 2 };
  const project = (point: Point): Point => ({ x: center.x + point.x * scale, y: center.y + point.y * scale });

  const ring: RingCellPosition[] = [];
  for (let cellIndex = 0; cellIndex < topology.ringLength; cellIndex += 1) {
    const player = Math.floor(cellIndex / (DEFAULT_CONFIG.sideLength - 1));
    const step = cellIndex % (DEFAULT_CONFIG.sideLength - 1);
    const visual = ENGINE_CORNER_TO_VISUAL[player];
    const point = project(ringPoint(visual, step));
    const isCorner = topology.isCornerRingIndex(cellIndex);
    ring.push({
      cellIndex,
      cornerPlayer: isCorner ? topology.cornerOwner(cellIndex) : null,
      x: point.x,
      y: point.y,
      size: (isCorner ? CORNER_CELL_SIZE : RING_CELL_SIZE) * scale,
    });
  }

  const corners: CornerPosition[] = ENGINE_CORNER_TO_VISUAL.map((visualCorner, playerIndex) => {
    const point = project(CORNERS[visualCorner]);
    return { playerIndex, visualCorner, x: point.x, y: point.y, size: CORNER_CELL_SIZE * scale };
  });

  const homes: HomeCellPosition[][] = ENGINE_CORNER_TO_VISUAL.map((visualCorner, playerIndex) =>
    HOME_CELL_SIZES.map((size, step) => {
      const point = project(scaleFromCenter(CORNERS[visualCorner], 1 - (step + 1) * HOME_SHRINK));
      return {
        playerIndex,
        step,
        cellIndex: topology.homeCellIndex(playerIndex, step),
        x: point.x,
        y: point.y,
        size: size * scale,
      };
    }),
  );

  const benches: BenchSlot[][] = ENGINE_CORNER_TO_VISUAL.map((visualCorner, playerIndex) => {
    const unit = { x: CORNERS[visualCorner].x / RING_RADIUS, y: CORNERS[visualCorner].y / RING_RADIUS };
    const rowCenter = { x: unit.x * BENCH_OFFSET, y: unit.y * BENCH_OFFSET };
    const along = { x: -unit.y, y: unit.x };
    return Array.from({ length: DEFAULT_CONFIG.numberOfPawns }, (_, pawnIndex) => {
      const offset = (pawnIndex - 1.5) * BENCH_GAP;
      const point = project({ x: rowCenter.x + along.x * offset, y: rowCenter.y + along.y * offset });
      return { playerIndex, pawnIndex, x: point.x, y: point.y };
    });
  });

  return {
    scale,
    center,
    boardSide: BOARD_DESIGN_SIZE * scale,
    cellSize: RING_CELL_SIZE * scale,
    cornerSize: CORNER_CELL_SIZE * scale,
    ring,
    corners,
    homes,
    benches,
  };
}

/** pos(cornerK, t) from docs/art-direction.md §4; t = 0..7, t = 7 is the next corner. */
function ringPoint(cornerK: number, t: number): Point {
  const corner = CORNERS[cornerK];
  const vertex = VERTICES[cornerK];
  const nextCorner = CORNERS[(cornerK + 1) % CORNERS.length];
  const distance = t * PITCH;

  if (distance <= RING_RADIUS) {
    return { x: corner.x + unit(vertex, corner).x * distance, y: corner.y + unit(vertex, corner).y * distance };
  }
  const along = unit(nextCorner, vertex);
  return { x: vertex.x + along.x * (distance - RING_RADIUS), y: vertex.y + along.y * (distance - RING_RADIUS) };
}

function unit(to: Point, from: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length };
}

function scaleFromCenter(point: Point, factor: number): Point {
  return { x: point.x * factor, y: point.y * factor };
}
