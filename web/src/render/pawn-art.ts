import { CanvasSource, Texture } from 'pixi.js';
import type { PlayerLook } from './palette';
import { PLAYERS } from './palette';

export interface PawnTextures {
  normal: Texture[];
  washed: Texture[];
}

/**
 * §5 chess-pawn silhouette (base Ø 84, ~92 px tall), drawn once per player into
 * a 2× supersampled canvas. The "washed" set is the §5 disabled look
 * (saturation 0.6); actual alpha stays on the sprite.
 */
export function createPawnTextures(): PawnTextures {
  // explicit CanvasSource: Texture.from's options version ignored resolution
  // here (art review #6 measured pawn sprites at 2x logical size)
  const textureOf = (canvas: HTMLCanvasElement): Texture =>
    new Texture({ source: new CanvasSource({ resource: canvas, resolution: 2 }) });
  return {
    normal: PLAYERS.map((look) => textureOf(pawnCanvas(look, false))),
    washed: PLAYERS.map((look) => textureOf(pawnCanvas(look, true))),
  };
}

const DESIGN_WIDTH = 100;
const DESIGN_HEIGHT = 112;
const BASE_CX = 50;
const BASE_CY = 97;

function pawnCanvas(look: PlayerLook, washed: boolean): HTMLCanvasElement {
  const scale = 2;
  const el = document.createElement('canvas');
  el.width = DESIGN_WIDTH * scale;
  el.height = DESIGN_HEIGHT * scale;
  const ctx = el.getContext('2d')!;
  ctx.scale(scale, scale);

  const light = washed ? desaturate(look.light, 0.6) : look.light;
  const base = washed ? desaturate(look.color, 0.6) : look.color;
  const deep = washed ? desaturate(look.deep, 0.6) : look.deep;

  const gradient = ctx.createLinearGradient(0, 9, 0, BASE_CY + 12);
  gradient.addColorStop(0, css(light));
  gradient.addColorStop(0.42, css(base));
  gradient.addColorStop(1, css(deep));
  const fillShape = (draw: () => void): void => {
    draw();
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  // base disc
  fillShape(() => {
    ctx.beginPath();
    ctx.ellipse(BASE_CX, BASE_CY, 40, 13, 0, 0, Math.PI * 2);
  });
  fillShape(() => {
    ctx.beginPath();
    ctx.ellipse(BASE_CX, BASE_CY - 6, 35, 10, 0, 0, Math.PI * 2);
  });

  // body trapezoid narrowing to the collar
  fillShape(() => {
    ctx.beginPath();
    ctx.moveTo(BASE_CX - 25, BASE_CY - 8);
    ctx.quadraticCurveTo(BASE_CX - 22, BASE_CY - 34, BASE_CX - 14, BASE_CY - 44);
    ctx.lineTo(BASE_CX + 14, BASE_CY - 44);
    ctx.quadraticCurveTo(BASE_CX + 22, BASE_CY - 34, BASE_CX + 25, BASE_CY - 8);
    ctx.closePath();
  });

  // neck collar
  fillShape(() => {
    ctx.beginPath();
    ctx.ellipse(BASE_CX, BASE_CY - 44, 17, 7, 0, 0, Math.PI * 2);
  });
  fillShape(() => {
    ctx.beginPath();
    ctx.ellipse(BASE_CX, BASE_CY - 48, 13, 5, 0, 0, Math.PI * 2);
  });

  // head sphere
  fillShape(() => {
    ctx.beginPath();
    ctx.arc(BASE_CX, BASE_CY - 72, 19.5, 0, Math.PI * 2);
  });

  // §3 porcelain lighting: one narrow spec arc top-left, soft rim bottom-right
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(BASE_CX, BASE_CY - 72, 15.5, Math.PI * 1.15, Math.PI * 1.55);
  ctx.stroke();
  ctx.strokeStyle = hexa(lighten(base, 60), 0.35);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(BASE_CX, BASE_CY - 72, 16.5, Math.PI * 0.08, Math.PI * 0.48);
  ctx.stroke();

  // §2 engraved player mark on the head — the grayscale channel
  drawEngravedSymbol(ctx, look.symbol, BASE_CX, BASE_CY - 72, 26, hexa(deep, 0.38), 'rgba(255,255,255,0.14)');

  // flat pad on the head, catches the key light
  ctx.fillStyle = hexa(minBleed(light), 0.75);
  ctx.beginPath();
  ctx.ellipse(BASE_CX - 4, BASE_CY - 88, 9, 3.2, -0.25, 0, Math.PI * 2);
  ctx.fill();

  return el;
}

function drawEngravedSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: PlayerLook['symbol'],
  cx: number,
  cy: number,
  size: number,
  dark: string,
  light: string,
): void {
  const r = size * 0.3;
  const paint = (color: string, dx: number, dy: number): void => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    switch (symbol) {
      case 'disc':
        ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'ring':
        ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
        ctx.lineWidth = size * 0.14;
        ctx.stroke();
        break;
      case 'diamond':
        ctx.moveTo(cx + dx, cy + dy - size / 2);
        ctx.lineTo(cx + dx + size / 2, cy + dy);
        ctx.lineTo(cx + dx, cy + dy + size / 2);
        ctx.lineTo(cx + dx - size / 2, cy + dy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.rect(cx + dx - size / 2, cy + dy - size / 2, size, size);
        ctx.fill();
        break;
    }
  };
  paint(light, 1, 1.4);
  paint(dark, 0, 0);
}

function desaturate(color: number, saturation: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (c: number): number => Math.round(luma + (c - luma) * saturation);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

// porcelain keeps a constant tint even when the player colour is washed out
function minBleed(color: number): number {
  return lighten(color, 40);
}

function css(color: number): string {
  return `rgb(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff})`;
}

function hexa(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff},${alpha})`;
}
