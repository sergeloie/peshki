import { Graphics } from 'pixi.js';
import { COLORS } from '../render/palette';

/** §7 modal-card plate: dark #241511 fill, brass edge. */
export function drawCardPlate(card: Graphics, width: number, height: number): void {
  card.clear();
  card.roundRect(-width / 2, -height / 2, width, height, 16).fill(0x241511);
  card.roundRect(-width / 2, -height / 2, width, height, 16).stroke({ width: 1, color: COLORS.brass, alpha: 0.8 });
}

/** §7 scrim: near-black veil, everything behind must read as not-tappable. */
export const SCRIM_FILL = 0x0b0603;
export const SCRIM_ALPHA = 0.72;
export const SCRIM_FADE_MS = 160;

/** Short fade-in for the scrim; fills stay at their own alpha, this animates Graphics.alpha. */
export function fadeScrimIn(scrim: Graphics): void {
  if (scrim.destroyed) return;
  scrim.alpha = 0;
  const started = performance.now();
  const step = (now: number): void => {
    if (scrim.destroyed) return;
    const t = Math.min(1, (now - started) / SCRIM_FADE_MS);
    scrim.alpha = t;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
