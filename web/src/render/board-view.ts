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
  /** §4: corner symbols stay engraved until the player's first pawn is placed. */
  setCornerOccupied(playerIndex: number, occupied: boolean): void;
}

/** Corner pitch ring beyond the ring cells (§4: corner cells are 132 design px). */
const CORNER_EXTRA = 132 - RING_CELL_SIZE;

export function createBoardView(initial: BoardGeometry, textures: GameTextures): BoardView {
  const root = new Container();
  const shadows = new Container();
  const base = new Graphics();
  const medallion = new Sprite({ texture: textures.medallion });
  const marks = new Graphics();
  const highlights = new Graphics();
  root.addChild(shadows, base, medallion, marks, highlights);

  let geometry = initial;
  let points = new Map<number, Point>();
  const occupiedCorners = [false, false, false, false];

  function layout(next: BoardGeometry): void {
    geometry = next;
    points = new Map<number, Point>();
    shadows.removeChildren();
    base.clear();
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
    const { center, scale } = geometry;
    const k = scale;
    const half = (BOARD_DESIGN_SIZE / 2) * k;
    const faceHalf = (BOARD_DESIGN_SIZE / 2 - 98) * k;

    base.roundRect(center.x - half, center.y - half, half * 2, half * 2, 12 * k).fill(COLORS.frame);
    base
      .moveTo(center.x - half + 14 * k, center.y - half + 1.6 * k)
      .lineTo(center.x + half - 14 * k, center.y - half + 1.6 * k)
      .stroke({ width: 1.5 * k, color: COLORS.frameEdge, alpha: 0.9 });
    base
      .moveTo(center.x - half + 1.6 * k, center.y - half + 14 * k)
      .lineTo(center.x - half + 1.6 * k, center.y + half - 14 * k)
      .stroke({ width: 1.5 * k, color: COLORS.frameEdge, alpha: 0.55 });
    base
      .moveTo(center.x + half - 2.4 * k, center.y - half + 12 * k)
      .lineTo(center.x + half - 2.4 * k, center.y + half - 12 * k)
      .stroke({ width: 2 * k, color: COLORS.frameDeep, alpha: 0.9 });
    base
      .moveTo(center.x - half + 12 * k, center.y + half - 2.4 * k)
      .lineTo(center.x + half - 12 * k, center.y + half - 2.4 * k)
      .stroke({ width: 2 * k, color: COLORS.frameDeep, alpha: 0.9 });

    // cherry face, then the static radial aging from §2
    base.roundRect(center.x - faceHalf, center.y - faceHalf, faceHalf * 2, faceHalf * 2, 8 * k).fill(COLORS.boardInner);
  }

  /** Continuous dark groove along the ring path (§4 «колея», width ~130 px with soft edges). */
  function drawTrack(): void {
    const { center, scale } = geometry;
    const R = 480 * scale;
    const cx = center.x;
    const cy = center.y;
    const octagon: Point[] = [
      { x: cx, y: cy - R },
      { x: cx + R, y: cy - R },
      { x: cx + R, y: cy },
      { x: cx + R, y: cy + R },
      { x: cx, y: cy + R },
      { x: cx - R, y: cy + R },
      { x: cx - R, y: cy },
      { x: cx - R, y: cy - R },
    ];
    strokePolygon(base, octagon, (RING_CELL_SIZE + 30) * scale, COLORS.track, 0.22);
    strokePolygon(base, octagon, (RING_CELL_SIZE + 10) * scale, COLORS.track, 0.5);
    strokePolygon(base, octagon, RING_CELL_SIZE * scale, COLORS.track, 1);
  }

  function drawCells(): void {
    const { scale } = geometry;
    for (const cell of geometry.ring) {
      points.set(cell.cellIndex, { x: cell.x, y: cell.y });
      addShadow(cell.x, cell.y, cell.size, 0.25);
      const look = cell.cornerPlayer === null ? null : PLAYERS[cell.cornerPlayer];
      drawTile(cell.x, cell.y, cell.size, look);
      const extra = look ? CORNER_EXTRA * scale : 0;
      if (look) {
        base
          .roundRect(
            cell.x - cell.size / 2 - extra / 2,
            cell.y - cell.size / 2 - extra / 2,
            cell.size + extra,
            cell.size + extra,
            12 * scale,
          )
          .stroke({ width: 3 * scale, color: look.color, alpha: 0.95 });
      }
    }
  }

  /** One tile: slab + 1 px brass reflected edge + lit face (+ corner ownership tint). */
  function drawTile(x: number, y: number, size: number, look: (typeof PLAYERS)[number] | null): void {
    const k = geometry.scale;
    const slab = look === null ? COLORS.cellDeep : mixColor(COLORS.cellDeep, look.color, 0.12);
    const face = look === null ? COLORS.cell : mixColor(COLORS.cell, look.color, 0.2);

    base.roundRect(x - size / 2, y - size / 2 + 4 * k, size, size, 12 * k).fill(slab);
    base
      .moveTo(x - size / 2 + 9 * k, y + size / 2 + 3.4 * k)
      .lineTo(x + size / 2 - 9 * k, y + size / 2 + 3.4 * k)
      .stroke({ width: 1 * k, color: COLORS.cellLight, alpha: 0.75 });
    base.roundRect(x - size / 2, y - size / 2 - 2 * k, size, size, 12 * k).fill(face);
    // top-left bevel under the single key light
    const r = 12 * k;
    base
      .moveTo(x - size / 2 + r, y - size / 2 - 2 * k + 1 * k)
      .lineTo(x + size / 2 - r * 0.55, y - size / 2 - 2 * k + 1 * k)
      .stroke({ width: 1.6 * k, color: COLORS.cellLight, alpha: 0.5 });
    base
      .moveTo(x - size / 2 + 1 * k, y - size / 2 - 2 * k + r)
      .lineTo(x - size / 2 + 1 * k, y + size / 2 - 2 * k - r * 0.45)
      .stroke({ width: 1.6 * k, color: COLORS.cellLight, alpha: 0.32 });
  }

  /** Porcelain wedges narrowing to the centre (§4 «лестница внутрь», no groove). */
  function drawHomes(): void {
    const { scale, center } = geometry;
    for (const homes of geometry.homes) {
      const look = PLAYERS[homes[0].playerIndex];
      for (const home of homes) {
        points.set(home.cellIndex, { x: home.x, y: home.y });
        addShadow(home.x, home.y, home.size * 1.05, 0.2);
        const u = normalize({ x: home.x - center.x, y: home.y - center.y });
        const perp = { x: -u.y, y: u.x };
        const s = home.size;
        const poly: Point[] = [
          { x: home.x + u.x * (s * 0.5) + perp.x * (s * 0.44), y: home.y + u.y * (s * 0.5) + perp.y * (s * 0.44) },
          { x: home.x + u.x * (s * 0.5) - perp.x * (s * 0.44), y: home.y + u.y * (s * 0.5) - perp.y * (s * 0.44) },
          { x: home.x - u.x * (s * 0.42) - perp.x * (s * 0.34), y: home.y - u.y * (s * 0.42) - perp.y * (s * 0.34) },
          { x: home.x - u.x * (s * 0.42) + perp.x * (s * 0.34), y: home.y - u.y * (s * 0.42) + perp.y * (s * 0.34) },
        ];
        base.poly(poly).fill(COLORS.ivory);
        base.poly(poly).stroke({ width: 1.6 * scale, color: look.color, alpha: 0.85 });
        // soft shading on the centre-facing edge, §3 «no glare»
        base
          .moveTo(poly[2].x, poly[2].y)
          .lineTo(poly[3].x, poly[3].y)
          .stroke({ width: 3.4 * scale, color: COLORS.ivoryDeep, alpha: 0.55 });
      }
    }
  }

  function drawMedallion(): void {
    const { center, scale } = geometry;
    const diameter = 230 * scale;
    medallion.width = diameter;
    medallion.height = diameter;
    medallion.position.set(center.x - diameter / 2, center.y - diameter / 2);
  }

  /** §4 benches: four recessed holes with rim light at the bottom edge. */
  function drawBenchSlots(): void {
    const { scale } = geometry;
    for (const benches of geometry.benches) {
      for (const slot of benches) {
        const r = 22 * scale;
        base.circle(slot.x, slot.y, r).fill(COLORS.engraved);
        base
          .arc(slot.x, slot.y - 1 * scale, r * 0.8, Math.PI * 0.12, Math.PI * 0.55)
          .stroke({ width: 3 * scale, color: COLORS.cell, alpha: 0.75 });
        base
          .arc(slot.x, slot.y, r, Math.PI * 0.9, Math.PI * 1.5)
          .stroke({ width: 2.4 * scale, color: COLORS.frameDeep, alpha: 0.85 });
        base.circle(slot.x, slot.y, r).stroke({ width: 1 * scale, color: COLORS.boardInner, alpha: 0.7 });
      }
    }
  }

  function drawCornerMarks(): void {
    marks.clear();
    const { scale } = geometry;
    geometry.corners.forEach((corner) => {
      if (occupiedCorners[corner.playerIndex]) return;
      const look = PLAYERS[corner.playerIndex];
      // engraved plate: dark pass on top, light pass offset into the key light
      drawSymbol(marks, look.symbol, corner.x + 1.4 * scale, corner.y + 2.2 * scale, corner.size * 0.44, look.light, 0.18);
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
    setCornerOccupied(playerIndex, occupied) {
      if (occupiedCorners[playerIndex] === occupied) return;
      occupiedCorners[playerIndex] = occupied;
      drawCornerMarks();
    },
    highlight(cellIndices, origin = null) {
      highlights.clear();
      const { scale } = geometry;
      if (origin !== null) {
        for (const cellIndex of cellIndices) {
          const target = points.get(cellIndex);
          if (target === undefined) continue;
          drawDottedLine(highlights, origin, target, 15 * scale, scale);
          highlights.circle(target.x, target.y, 10 * scale).fill({ color: COLORS.brass, alpha: 0.95 });
          highlights
            .circle(target.x, target.y, 10 * scale)
            .stroke({ width: 2.5 * scale, color: COLORS.brassLight, alpha: 0.9 });
        }
        return;
      }
      for (const cellIndex of cellIndices) {
        const point = points.get(cellIndex);
        if (point === undefined) continue;
        highlights
          .circle(point.x, point.y, geometry.cellSize * 0.46)
          .stroke({ width: 5 * scale, color: COLORS.brass, alpha: 0.85 });
        highlights.circle(point.x, point.y, 7 * scale).fill(COLORS.brassLight);
      }
    },
  };
}

/** §7.3 dotted brass hint line. */
function drawDottedLine(graphics: Graphics, from: Point, to: Point, dash: number, scale: number): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < dash) return;
  const ux = dx / length;
  const uy = dy / length;
  for (let d = length * 0.24; d < length - 8 * scale; d += dash) {
    graphics.circle(from.x + ux * d, from.y + uy * d, 2.6 * scale).fill({ color: COLORS.brassLight, alpha: 0.85 });
  }
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
