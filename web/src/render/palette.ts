import type { Graphics } from 'pixi.js';

export const COLORS = {
  table: 0x2e1710,
  frame: 0x503018,
  frameEdge: 0x7a4a2c,
  boardInner: 0x6b3a20,
  boardInnerDeep: 0x4a2a16,
  cell: 0x8a5a34,
  cellLight: 0xbf8b52,
  cellDeep: 0x4a2a16,
  brass: 0xc9a227,
  brassLight: 0xf3d77b,
  brassDeep: 0x6e5410,
  ivory: 0xf2ead8,
  ivoryDeep: 0xc9bba0,
  engraved: 0x2a140d,
  panel: 0x1a0c07,
  spentPip: 0x6b5a48,
} as const;

export type PlayerSymbol = 'disc' | 'ring' | 'diamond' | 'square';

export interface PlayerLook {
  color: number;
  light: number;
  deep: number;
  symbol: PlayerSymbol;
}

/** Engine player index -> art-direction colour and symbol. Player 0 is the human south. */
export const PLAYERS: PlayerLook[] = [
  { color: 0xc0473a, light: 0xe8836f, deep: 0x6e1f17, symbol: 'disc' },
  { color: 0xede4d4, light: 0xffffff, deep: 0xa89880, symbol: 'ring' },
  { color: 0x2e948e, light: 0x79cfc8, deep: 0x12403c, symbol: 'diamond' },
  { color: 0x4668b8, light: 0x8fa8e8, deep: 0x1e3060, symbol: 'square' },
];

export function drawSymbol(
  graphics: Graphics,
  symbol: PlayerSymbol,
  cx: number,
  cy: number,
  size: number,
  color: number,
  alpha = 1,
): void {
  const radius = size * 0.3;
  switch (symbol) {
    case 'disc':
      graphics.circle(cx, cy, radius).fill({ color, alpha });
      break;
    case 'ring':
      graphics.circle(cx, cy, radius).stroke({ width: size * 0.14, color, alpha });
      break;
    case 'diamond':
      graphics
        .poly([cx, cy - size / 2, cx + size / 2, cy, cx, cy + size / 2, cx - size / 2, cy])
        .fill({ color, alpha });
      break;
    case 'square':
      graphics.rect(cx - size / 2, cy - size / 2, size, size).fill({ color, alpha });
      break;
  }
}
