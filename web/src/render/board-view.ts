import { Container, Graphics, Sprite } from 'pixi.js';
import type { BoardGeometry, Point } from './board-geometry';
import { BOARD_DESIGN_SIZE, RING_CELL_SIZE } from './board-geometry';
import type { GameTextures } from './textures';
import { COLORS, PLAYERS, drawSymbol } from './palette';

export interface BoardView {
  root: Container;
  layout(geometry: BoardGeometry): void;
  pointOf(cellIndex: number): Point | null;
  /** §7.3 move hint: dotted brass line from the selected pawn to each legal target. */
  highlight(cellIndices: number[], origin?: Point | null): void;
  /** TV/keyboard focus ring over a legal target cell (board is reachable without a pointer). */
  focusCell(cellIndex: number | null): void;
  /** §4: corner symbols stay engraved until the player's first pawn is placed. */
  setCornerOccupied(playerIndex: number, occupied: boolean): void;
  /** Debug harness (art review #6): show only the named material layers. */
  setLayerVisible(names: ReadonlySet<string>): void;
}

export const BOARD_LAYERS = [
  'shadows',
  'track',
  'frame',
  'cells',
  'tails',
  'benches',
  'medallion',
  'marks',
  'highlights',
] as const;

/** Corner floor ledger beyond the ring cells (§4: corner cells are 132 design px). */
const CORNER_EXTRA = 132 - RING_CELL_SIZE;

export function createBoardView(initial: BoardGeometry, textures: GameTextures): BoardView {
  const root = new Container();
  const shadows = new Container();
  // one Graphics per material: strokes never leak between fill accumulators and
  // the debug harness can isolate any layer (art review, ticket #6)
  const trackG = new Graphics();
  const frameG = new Graphics();
  const cellsG = new Graphics();
  const tailsG = new Graphics();
  const benchesG = new Graphics();
  const medallion = new Sprite({ texture: textures.medallion });
  const marks = new Graphics();
  const highlights = new Graphics();
  // keyboard focus ring is not part of the debug layer ledger: an input state, not material
  const focusG = new Graphics();
  root.addChild(shadows, frameG, trackG, cellsG, tailsG, benchesG, medallion, marks, highlights, focusG);

  const layerOf: Record<(typeof BOARD_LAYERS)[number], Container> = {
    shadows,
    track: trackG,
    frame: frameG,
    cells: cellsG,
    tails: tailsG,
    benches: benchesG,
    medallion,
    marks,
    highlights,
  };

  let geometry = initial;
  let points = new Map<number, Point>();
  const occupiedCorners = [false, false, false, false];

  function layout(next: BoardGeometry): void {
    geometry = next;
    points = new Map<number, Point>();
    shadows.removeChildren();
    frameG.clear();
    trackG.clear();
    cellsG.clear();
    tailsG.clear();
    benchesG.clear();
    marks.clear();
    drawFrame();
    drawTrack();
    drawCells();
    drawHomes();
    drawMedallion();
    drawBenchSlots();
    drawCornerMarks();
  }

  /** Walnut frame with the §3 height-fall: bright top-left edge, dark bottom-right. */
  function drawFrame(): void {
    const { center, scale: k } = geometry;
    const half = (BOARD_DESIGN_SIZE / 2) * k;
    const faceHalf = (BOARD_DESIGN_SIZE / 2 - 98) * k;

    frameG.roundRect(center.x - half, center.y - half, half * 2, half * 2, 12 * k).fill(COLORS.frame);
    frameG
      .moveTo(center.x - half + 14 * k, center.y - half + 1.6 * k)
      .lineTo(center.x + half - 14 * k, center.y - half + 1.6 * k)
      .stroke({ width: 1.5 * k, color: COLORS.frameEdge, alpha: 0.9 });
    frameG
      .moveTo(center.x - half + 1.6 * k, center.y - half + 14 * k)
      .lineTo(center.x - half + 1.6 * k, center.y + half - 14 * k)
      .stroke({ width: 1.5 * k, color: COLORS.frameEdge, alpha: 0.55 });
    frameG
      .moveTo(center.x + half - 2.4 * k, center.y - half + 12 * k)
      .lineTo(center.x + half - 2.4 * k, center.y + half - 12 * k)
      .stroke({ width: 2 * k, color: COLORS.frameDeep, alpha: 0.9 });
    frameG
      .moveTo(center.x - half + 12 * k, center.y + half - 2.4 * k)
      .lineTo(center.x + half - 12 * k, center.y + half - 2.4 * k)
      .stroke({ width: 2 * k, color: COLORS.frameDeep, alpha: 0.9 });

    // cherry face under the cells
    frameG.roundRect(center.x - faceHalf, center.y - faceHalf, faceHalf * 2, faceHalf * 2, 8 * k).fill(COLORS.boardInner);
  }

  /** Continuous dark groove along the ring path (§4 «колея»). */
  function drawTrack(): void {
    const { center, scale: k } = geometry;
    const R = 480 * k;
    const octagon: Point[] = [
      { x: center.x, y: center.y - R },
      { x: center.x + R, y: center.y - R },
      { x: center.x + R, y: center.y },
      { x: center.x + R, y: center.y + R },
      { x: center.x, y: center.y + R },
      { x: center.x - R, y: center.y + R },
      { x: center.x - R, y: center.y },
      { x: center.x - R, y: center.y - R },
    ];
    strokePolygon(trackG, octagon, (RING_CELL_SIZE + 30) * k, COLORS.track, 0.22);
    strokePolygon(trackG, octagon, (RING_CELL_SIZE + 10) * k, COLORS.track, 0.5);
    strokePolygon(trackG, octagon, RING_CELL_SIZE * k, COLORS.track, 1);
  }

  function drawCells(): void {
    const { scale: k } = geometry;
    for (const cell of geometry.ring) {
      points.set(cell.cellIndex, { x: cell.x, y: cell.y });
      addShadow(cell.x, cell.y, cell.size, 0.25);
      const look = cell.cornerPlayer === null ? null : PLAYERS[cell.cornerPlayer];
      drawTile(cell.x, cell.y, cell.size, look);
      const extra = look ? CORNER_EXTRA * k : 0;
      if (look) {
        cellsG
          .roundRect(
            cell.x - cell.size / 2 - extra / 2,
            cell.y - cell.size / 2 - extra / 2,
            cell.size + extra,
            cell.size + extra,
            12 * k,
          )
          .stroke({ width: 3 * k, color: look.color, alpha: 0.95 });
      }
    }
  }

  /** One tile: slab + 1 px brass reflected edge + lit face (+ corner ownership tint). */
  function drawTile(x: number, y: number, size: number, look: (typeof PLAYERS)[number] | null): void {
    const k = geometry.scale;
    const slab = look === null ? COLORS.cellDeep : mixColor(COLORS.cellDeep, look.color, 0.12);
    const face = look === null ? COLORS.cell : mixColor(COLORS.cell, look.color, 0.2);

    cellsG.roundRect(x - size / 2, y - size / 2 + 4 * k, size, size, 12 * k).fill(slab);
    cellsG
      .moveTo(x - size / 2 + 9 * k, y + size / 2 + 3.4 * k)
      .lineTo(x + size / 2 - 9 * k, y + size / 2 + 3.4 * k)
      .stroke({ width: 1 * k, color: COLORS.cellLight, alpha: 0.75 });
    cellsG.roundRect(x - size / 2, y - size / 2 - 2 * k, size, size, 12 * k).fill(face);
    // single top bevel under the key light — no left-edge stack: seven west
    // cells side by side read as a bright wall along the face edge (art review)
    const r = 12 * k;
    cellsG
      .moveTo(x - size / 2 + r, y - size / 2 - 2 * k + 1 * k)
      .lineTo(x + size / 2 - r * 0.55, y - size / 2 - 2 * k + 1 * k)
      .stroke({ width: 1.6 * k, color: COLORS.cellLight, alpha: 0.5 });
  }

  /**
   * §4 home tails: exactly THREE porcelain steps per tail (104 → 96 → 88),
   * narrowing toward the centre. Spans ±0.36 of the step size leave visible
   * grooves between steps; the first starts inboard of the corner tile's inner
   * edge (design 414), the last clears the medallion (design 118).
   */
  function drawHomes(): void {
    const { scale: k, center } = geometry;
    const cellInner = (480 - RING_CELL_SIZE / 2 - 8) * k; // design 414
    const medallionEdge = (110 + 8) * k; // design 118
    for (const homes of geometry.homes) {
      const look = PLAYERS[homes[0].playerIndex];
      for (const home of homes) {
        points.set(home.cellIndex, { x: home.x, y: home.y });
        addShadow(home.x, home.y, home.size * 0.98, 0.16);
        const d = Math.hypot(home.x - center.x, home.y - center.y);
        const u = normalize({ x: home.x - center.x, y: home.y - center.y });
        const perp = { x: -u.y, y: u.x };
        const s = home.size;
        const radiusOuter = Math.min(d + s * 0.36, cellInner);
        const radiusInner = Math.max(d - s * 0.36, medallionEdge);
        const at = (radius: number, halfWidth: number, sign: number): Point => ({
          x: center.x + u.x * radius + perp.x * halfWidth * sign,
          y: center.y + u.y * radius + perp.y * halfWidth * sign,
        });
        const poly: Point[] = [
          at(radiusOuter, s * 0.44, 1),
          at(radiusOuter, s * 0.44, -1),
          at(radiusInner, s * 0.36, -1),
          at(radiusInner, s * 0.36, 1),
        ];
        tailsG.poly(poly).fill(COLORS.ivory);
        tailsG.poly(poly).stroke({ width: 1.6 * k, color: look.color, alpha: 0.9 });
        // one thickness line under the outer edge, away from the light (§3)
        tailsG
          .moveTo(poly[0].x, poly[0].y)
          .lineTo(poly[1].x, poly[1].y)
          .stroke({ width: 2.6 * k, color: COLORS.ivoryDeep, alpha: 0.6 });
      }
    }
  }

  function drawMedallion(): void {
    const { center, scale: k } = geometry;
    const diameter = 230 * k;
    medallion.width = diameter;
    medallion.height = diameter;
    medallion.position.set(center.x - diameter / 2, center.y - diameter / 2);
  }

  /** §4 benches: four recessed seats Ø53 with rim light. */
  function drawBenchSlots(): void {
    const { scale: k } = geometry;
    for (const benches of geometry.benches) {
      for (const slot of benches) {
        const r = 26.5 * k;
        benchesG.circle(slot.x, slot.y, r).fill(COLORS.engraved);
        strokeArc(benchesG, slot.x, slot.y - 1 * k, r * 0.8, Math.PI * 0.12, Math.PI * 0.55, {
          width: 3 * k,
          color: COLORS.cell,
          alpha: 0.75,
        });
        strokeArc(benchesG, slot.x, slot.y, r * 0.95, Math.PI * 0.9, Math.PI * 1.5, {
          width: 2.4 * k,
          color: COLORS.frameDeep,
          alpha: 0.85,
        });
      }
    }
  }

  function drawCornerMarks(): void {
    marks.clear();
    const { scale: k } = geometry;
    geometry.corners.forEach((corner) => {
      if (occupiedCorners[corner.playerIndex]) return;
      const look = PLAYERS[corner.playerIndex];
      drawSymbol(marks, look.symbol, corner.x + 1.4 * k, corner.y + 2.2 * k, corner.size * 0.44, look.light, 0.18);
      drawSymbol(marks, look.symbol, corner.x, corner.y, corner.size * 0.44, look.deep, 0.5);
    });
  }

  function addShadow(x: number, y: number, size: number, alpha: number): void {
    const sprite = new Sprite({ texture: textures.cellShadow });
    sprite.anchor.set(0.5);
    sprite.width = size * 1.4;
    sprite.height = size * 1.4;
    sprite.position.set(x + 4 * geometry.scale, y + 6 * geometry.scale);
    sprite.alpha = alpha;
    shadows.addChild(sprite);
  }

  layout(initial);

  return {
    root,
    layout,
    pointOf(cellIndex) {
      return points.get(cellIndex) ?? null;
    },
    focusCell(cellIndex) {
      focusG.clear();
      if (cellIndex === null) return;
      const point = points.get(cellIndex);
      if (point === undefined) return;
      const { scale: k, cellSize } = geometry;
      focusG
        .circle(point.x, point.y, cellSize * 0.52)
        .stroke({ width: 4 * k, color: COLORS.brassLight, alpha: 0.95 });
      focusG
        .circle(point.x, point.y, cellSize * 0.52 - 7 * k)
        .stroke({ width: 1.5 * k, color: COLORS.brass, alpha: 0.9 });
    },
    setCornerOccupied(playerIndex, occupied) {
      if (occupiedCorners[playerIndex] === occupied) return;
      occupiedCorners[playerIndex] = occupied;
      drawCornerMarks();
    },
    setLayerVisible(names) {
      for (const [name, layer] of Object.entries(layerOf)) layer.visible = names.has(name);
    },
    highlight(cellIndices, origin = null) {
      highlights.clear();
      const { scale: k } = geometry;
      if (origin !== null) {
        for (const cellIndex of cellIndices) {
          const target = points.get(cellIndex);
          if (target === undefined) continue;
          drawDottedLine(highlights, origin, target, 15 * k, k);
          highlights.circle(target.x, target.y, 10 * k).fill({ color: COLORS.brass, alpha: 0.95 });
          highlights
            .circle(target.x, target.y, 10 * k)
            .stroke({ width: 2.5 * k, color: COLORS.brassLight, alpha: 0.9 });
        }
        return;
      }
      for (const cellIndex of cellIndices) {
        const point = points.get(cellIndex);
        if (point === undefined) continue;
        highlights
          .circle(point.x, point.y, geometry.cellSize * 0.46)
          .stroke({ width: 5 * k, color: COLORS.brass, alpha: 0.85 });
        highlights.circle(point.x, point.y, 7 * k).fill(COLORS.brassLight);
      }
    },
  };
}

/** §7.3 dotted brass hint line. */
function drawDottedLine(graphics: Graphics, from: Point, to: Point, dash: number, k: number): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < dash) return;
  const ux = dx / length;
  const uy = dy / length;
  for (let d = length * 0.24; d < length - 8 * k; d += dash) {
    graphics.circle(from.x + ux * d, from.y + uy * d, 2.6 * k).fill({ color: COLORS.brassLight, alpha: 0.85 });
  }
}

/**
 * Arc stroke re-seeded with moveTo: Pixi v8 adds arc points into the current
 * sub-path, so a fresh seed keeps the arc isolated from previous shapes.
 */
function strokeArc(
  graphics: Graphics,
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  style: Parameters<Graphics['stroke']>[0],
): void {
  graphics.moveTo(x + Math.cos(startAngle) * radius, y + Math.sin(startAngle) * radius);
  graphics.arc(x, y, radius, startAngle, endAngle);
  graphics.stroke(style);
}

function strokePolygon(graphics: Graphics, points: Point[], width: number, color: number, alpha: number): void {
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.closePath().stroke({ width, color, alpha, join: 'round' });
}

function mixColor(a: number, b: number, t: number): number {
  const ar = a >> 16;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = b >> 16;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function normalize(point: Point): Point {
  const length = Math.hypot(point.x, point.y) || 1;
  return { x: point.x / length, y: point.y / length };
}
