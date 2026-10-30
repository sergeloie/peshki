import { describe, expect, it } from 'vitest';
import {
  HOME_CELL_SIZES,
  RING_RADIUS,
  createBoardGeometry,
} from '../../src/render/board-geometry';

const WIDTH = 1280;
const HEIGHT = 1280;

describe('board geometry (docs/art-direction.md §4)', () => {
  it('places 28 distinct ring cells', () => {
    const geometry = createBoardGeometry(WIDTH, HEIGHT);

    expect(geometry.ring).toHaveLength(28);
    const distinct = new Set(geometry.ring.map((cell) => `${Math.round(cell.x)},${Math.round(cell.y)}`));
    expect(distinct.size).toBe(28);
  });

  it('puts the four corners on the side midpoints at documented coordinates', () => {
    const geometry = createBoardGeometry(WIDTH, HEIGHT);
    const { center, scale, corners } = geometry;

    expect(corners).toHaveLength(4);
    // Engine player 0 is south; 1 west, 2 north, 3 east.
    expect(corners[0].x).toBeCloseTo(center.x, 6);
    expect(corners[0].y).toBeCloseTo(center.y + RING_RADIUS * scale, 6);
    expect(corners[1].x).toBeCloseTo(center.x - RING_RADIUS * scale, 6);
    expect(corners[1].y).toBeCloseTo(center.y, 6);
    expect(corners[2].x).toBeCloseTo(center.x, 6);
    expect(corners[2].y).toBeCloseTo(center.y - RING_RADIUS * scale, 6);
    expect(corners[3].x).toBeCloseTo(center.x + RING_RADIUS * scale, 6);
    expect(corners[3].y).toBeCloseTo(center.y, 6);
  });

  it('gives every player a three-cell home tail', () => {
    const geometry = createBoardGeometry(WIDTH, HEIGHT);

    expect(geometry.homes).toHaveLength(4);
    for (const homes of geometry.homes) {
      expect(homes).toHaveLength(3);
      expect(homes.map((home) => home.size)).toEqual(HOME_CELL_SIZES.map((size) => size * geometry.scale));
    }
  });

  it('keeps every two cells at least a cell apart', () => {
    const geometry = createBoardGeometry(WIDTH, HEIGHT);
    const cells = [
      ...geometry.ring.map((cell) => ({ x: cell.x, y: cell.y, size: cell.size })),
      ...geometry.homes.flat().map((cell) => ({ x: cell.x, y: cell.y, size: cell.size })),
    ];
    const smallestCell = Math.min(...cells.map((cell) => cell.size));

    let closest = Number.POSITIVE_INFINITY;
    for (let a = 0; a < cells.length; a += 1) {
      for (let b = a + 1; b < cells.length; b += 1) {
        closest = Math.min(closest, Math.hypot(cells[a].x - cells[b].x, cells[a].y - cells[b].y));
      }
    }

    expect(closest).toBeGreaterThanOrEqual(smallestCell - 1e-6);
  });

  it('orders ring cells clockwise', () => {
    const geometry = createBoardGeometry(WIDTH, HEIGHT);
    const { center, ring } = geometry;

    for (let index = 0; index < ring.length; index += 1) {
      const current = { x: ring[index].x - center.x, y: ring[index].y - center.y };
      const next = { x: ring[(index + 1) % ring.length].x - center.x, y: ring[(index + 1) % ring.length].y - center.y };
      expect(current.x * next.y - current.y * next.x, `cells ${index} -> ${index + 1}`).toBeGreaterThan(0);
    }
  });
});
