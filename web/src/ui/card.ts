import { Graphics } from 'pixi.js';
import { COLORS } from '../render/palette';

/** §7 modal-card plate: dark #241511 fill, brass edge. */
export function drawCardPlate(card: Graphics, width: number, height: number): void {
  card.clear();
  card.roundRect(-width / 2, -height / 2, width, height, 16).fill(0x241511);
  card.roundRect(-width / 2, -height / 2, width, height, 16).stroke({ width: 1, color: COLORS.brass, alpha: 0.8 });
}
