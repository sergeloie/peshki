import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { COLORS } from '../render/palette';
import { FONTS } from '../render/fonts';
import { audio } from '../render/audio';

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
    // #8 deferred cosmetics: buttons are engraved brass plaques, not web pills
    const radius = Math.min(10, height * 0.2);
    plate.roundRect(-width / 2, -height / 2, width, height, radius).fill(kind === 'primary' ? COLORS.cell : 0x241511);
    // top sheen, below the key light
    plate
      .moveTo(-width / 2 + radius, -height / 2 + 2.4)
      .lineTo(width / 2 - radius, -height / 2 + 2.4)
      .stroke({ width: 2, color: kind === 'primary' ? COLORS.cellLight : COLORS.brassLight, alpha: kind === 'primary' ? 0.55 : 0.4 });
    // bottom chamfer, carved darker
    plate
      .moveTo(-width / 2 + radius, height / 2 - 3.2)
      .lineTo(width / 2 - radius, height / 2 - 3.2)
      .stroke({ width: 3, color: 0x120a05, alpha: kind === 'primary' ? 0.5 : 0.75 });
    // engraving pass inside the outer edge
    plate
      .roundRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6, Math.max(0, radius - 2))
      .stroke({ width: 1, color: 0x120a05, alpha: 0.6 });
    // outer brass border
    plate
      .roundRect(-width / 2, -height / 2, width, height, radius)
      .stroke({ width: 1.6, color: COLORS.brass, alpha: kind === 'primary' ? 0.8 : 0.95 });
    // two rivets: the plaque is mounted, not floating (skip on narrow tiles)
    if (width > 220) {
      for (const sign of [-1, 1]) {
        plate.circle(sign * (width / 2 - 14), 0, 3).fill({ color: COLORS.brassLight, alpha: 0.85 });
        plate.circle(sign * (width / 2 - 14) + 0.8, 1, 2.6).fill({ color: COLORS.brassDeep, alpha: 0.9 });
      }
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
  root.on('pointertap', () => {
    audio.play('button');
    onTap?.();
  });

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
      audio.play('button');
      root.scale.set(0.96);
      setTimeout(() => root.scale.set(1), 90);
      onTap?.();
    },
  };
}
