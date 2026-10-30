import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { COLORS } from '../render/palette';
import { FONTS } from '../render/fonts';

export type ButtonKind = 'primary' | 'secondary';

export interface Button {
  root: Container;
  setLabel(text: string): void;
  setFont(size: number): void;
  /** Re-draws the plate for a new size; keeps the label centred. */
  setSize(width: number, height?: number): void;
  setFocused(value: boolean): void;
  isFocused(): boolean;
  /** Keyboard activation: same pulse and action as a pointer tap. */
  activate(): void;
}

/**
 * Menu / dialog button in the club-table language:
 * primary wood face (#8A5A34 + sheen), secondary dark plate with a brass edge.
 */
export function createButton(
  label: string,
  options: { kind?: ButtonKind; width: number; height?: number; onTap?: () => void },
): Button {
  const kind = options.kind ?? 'secondary';
  const onTap = options.onTap;
  let width = options.width;
  let height = options.height ?? 52;
  let focused = false;

  const root = new Container();
  const plate = new Graphics();
  const ring = new Graphics();
  const text = new Text({
    text: label,
    style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '700' },
  });
  text.anchor.set(0.5);
  root.addChild(plate, ring, text);
  root.eventMode = 'static';
  root.cursor = 'pointer';

  function draw(): void {
    plate.clear();
    if (kind === 'primary') {
      plate.roundRect(-width / 2, -height / 2, width, height, height / 2).fill(COLORS.cell);
      plate
        .moveTo(-width / 2 + height / 2, -height / 2 + 2.2)
        .lineTo(width / 2 - height / 2, -height / 2 + 2.2)
        .stroke({ width: 2, color: COLORS.cellLight, alpha: 0.6 });
      plate
        .moveTo(-width / 2 + height / 2, height / 2 - 3)
        .lineTo(width / 2 - height / 2, height / 2 - 3)
        .stroke({ width: 3, color: 0x40200f, alpha: 0.85 });
      plate
        .roundRect(-width / 2, -height / 2, width, height, height / 2)
        .stroke({ width: 1.5, color: COLORS.brass, alpha: 0.8 });
    } else {
      plate.roundRect(-width / 2, -height / 2, width, height, height / 2).fill(COLORS.panel);
      plate
        .roundRect(-width / 2, -height / 2, width, height, height / 2)
        .stroke({ width: 1, color: COLORS.brass, alpha: 0.66 });
    }
    ring.clear();
    if (focused) {
      ring
        .roundRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, height / 2 + 5)
        .stroke({ width: 3, color: COLORS.brassLight, alpha: 0.95 });
    }
    root.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
  }

  root.on('pointerdown', () => root.scale.set(0.96));
  const release = () => root.scale.set(1);
  root.on('pointerup', release);
  root.on('pointerupoutside', release);
  root.on('pointerleave', release);
  root.on('pointertap', () => onTap?.());

  draw();

  return {
    root,
    setLabel(value) {
      text.text = value;
    },
    setFont(size) {
      text.style.fontSize = size;
    },
    setSize(nextWidth, nextHeight) {
      if (nextHeight !== undefined) height = nextHeight;
      width = nextWidth;
      draw();
    },
    setFocused(value) {
      if (focused === value) return;
      focused = value;
      draw();
    },
    isFocused() {
      return focused;
    },
    activate() {
      root.scale.set(0.96);
      setTimeout(() => root.scale.set(1), 90);
      onTap?.();
    },
  };
}
