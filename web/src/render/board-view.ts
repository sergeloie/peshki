import { Container, Graphics } from 'pixi.js';
import type { BoardGeometry, Point } from './board-geometry';
import { BOARD_DESIGN_SIZE, RING_CELL_SIZE } from './board-geometry';
import { COLORS, PLAYERS, drawSymbol } from './palette';

export interface BoardView {
  root: Container;
  layout(geometry: BoardGeometry): void;
  pointOf(cellIndex: number): Point | null;
  highlight(cellIndices: number[]): void;
}

export function createBoardView(initial: BoardGeometry): BoardView {
  const root = new Container();
  const base = new Graphics();
  const highlights = new Graphics();
  root.addChild(base, highlights);

  let geometry = initial;
  let points = new Map<number, Point>();

  function layout(next: BoardGeometry): void {
    geometry = next;
    points = new Map<number, Point>();
    base.clear();
    highlights.clear();
    drawBase();
  }

  function drawBase(): void {
    const { center, scale } = geometry;
    const half = (BOARD_DESIGN_SIZE / 2) * scale;
    const faceHalf = (BOARD_DESIGN_SIZE / 2 - 98) * scale;

    base.roundRect(center.x - half, center.y - half, half * 2, half * 2, 10 * scale).fill(COLORS.frame);
    base
      .roundRect(center.x - half, center.y - half, half * 2, half * 2, 10 * scale)
      .stroke({ width: 2 * scale, color: COLORS.frameEdge });
    base.roundRect(center.x - faceHalf, center.y - faceHalf, faceHalf * 2, faceHalf * 2, 6 * scale).fill(COLORS.boardInner);

    const quad = [...geometry.corners].sort((a, b) => a.visualCorner - b.visualCorner);
    base.moveTo(quad[0].x, quad[0].y);
    for (const corner of quad.slice(1)) base.lineTo(corner.x, corner.y);
    base.closePath().stroke({ width: (RING_CELL_SIZE + 14) * scale, color: COLORS.cellDeep, join: 'round' });

    for (const cell of geometry.ring) {
      points.set(cell.cellIndex, { x: cell.x, y: cell.y });
      const look = cell.cornerPlayer === null ? null : PLAYERS[cell.cornerPlayer];
      base.roundRect(cell.x - cell.size / 2, cell.y - cell.size / 2, cell.size, cell.size, 8 * scale).fill(COLORS.cell);
      base
        .roundRect(cell.x - cell.size / 2, cell.y - cell.size / 2, cell.size, cell.size, 8 * scale)
        .stroke({ width: (look ? 3 : 1.5) * scale, color: look ? look.color : COLORS.cellDeep });
      if (look) drawSymbol(base, look.symbol, cell.x, cell.y, cell.size * 0.42, look.deep, 0.35);
    }

    for (const homes of geometry.homes) {
      for (const home of homes) {
        points.set(home.cellIndex, { x: home.x, y: home.y });
        const look = PLAYERS[home.playerIndex];
        base
          .roundRect(home.x - home.size / 2, home.y - home.size / 2, home.size, home.size, 6 * scale)
          .fill(COLORS.ivory);
        base
          .roundRect(home.x - home.size / 2, home.y - home.size / 2, home.size, home.size, 6 * scale)
          .stroke({ width: 2 * scale, color: look.color });
      }
    }

    for (const benches of geometry.benches) {
      for (const slot of benches) {
        base.circle(slot.x, slot.y, 22 * scale).fill(COLORS.engraved);
        base.circle(slot.x, slot.y, 22 * scale).stroke({ width: 1 * scale, color: COLORS.boardInner });
      }
    }
  }

  layout(initial);

  return {
    root,
    layout,
    pointOf(cellIndex) {
      return points.get(cellIndex) ?? null;
    },
    highlight(cellIndices) {
      highlights.clear();
      for (const cellIndex of cellIndices) {
        const point = points.get(cellIndex);
        if (point === undefined) continue;
        highlights.circle(point.x, point.y, geometry.cellSize * 0.5).stroke({ width: 4 * geometry.scale, color: COLORS.brass });
        highlights.circle(point.x, point.y, 7 * geometry.scale).fill(COLORS.brassLight);
      }
    },
  };
}
