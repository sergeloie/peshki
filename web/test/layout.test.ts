import { describe, expect, it, beforeEach } from 'vitest';
import { computeGameLayout, configureSafeArea } from '../src/render/hud';

/** Issue #8 acceptance: at least 8 real device sizes across all four aspect classes. */
const SIZES = [
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'small phone portrait', width: 360, height: 640 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'square window', width: 800, height: 800 },
  { name: 'square tiny', width: 480, height: 480 },
  { name: 'tablet landscape 4:3', width: 1024, height: 768 },
  { name: 'desktop 16:9', width: 1280, height: 720 },
  { name: 'desktop wide', width: 1680, height: 1050 },
  { name: 'TV 4K', width: 1920, height: 1080 },
  { name: 'TV landscape', width: 2560, height: 1440 },
] as const;

describe('layout matrix', () => {
  beforeEach(() => configureSafeArea({ top: 0, right: 0, bottom: 0, left: 0 }));

  for (const size of SIZES) {
    it(`board and HUD live inside the viewport: ${size.name} ${size.width}x${size.height}`, () => {
      const layout = computeGameLayout(size.width, size.height);
      expect(layout.board.size).toBeGreaterThan(0);
      expect(layout.board.x).toBeGreaterThanOrEqual(0);
      expect(layout.board.y).toBeGreaterThanOrEqual(0);
      // no clipping in either axis, board stays square
      expect(layout.board.x + layout.board.size).toBeLessThanOrEqual(size.width);
      expect(layout.board.y + layout.board.size).toBeLessThanOrEqual(size.height);
      expect(layout.board.size).toBeGreaterThan(Math.min(size.width, size.height) * 0.3);
      // four classes resolve sanely: square/small windows use the portrait arrangement
      const isSquare = size.width <= size.height * 1.2;
      expect(layout.orientation).toBe(isSquare ? 'portrait' : 'landscape');
      expect(layout.isTv).toBe(Math.max(size.width, size.height) >= 1600);
      expect(layout.baseFont).toBe(layout.isTv ? 20 : Math.min(size.width, size.height) >= 600 ? 17 : 16);
    });
  }

  it('env insets push the board and tray clear of notches', () => {
    configureSafeArea({ top: 44, right: 12, bottom: 34, left: 0 });
    const layout = computeGameLayout(390, 844);
    // §7.3: chips bar (72) then board, tray (224) clear of the bottom inset
    expect(layout.board.y).toBeGreaterThanOrEqual(44 + 72);
    expect(layout.board.y + layout.board.size).toBeLessThanOrEqual(844 - 34 - 224);
  });
});
