import { Container, Graphics, Text } from 'pixi.js';
import { FONTS } from '../render/fonts';
import { COLORS } from '../render/palette';
import { STRINGS } from './strings';

export interface Menu {
  root: Container;
  layout(width: number, height: number): void;
}

export function createMenu(options: { title: string; onPlay?: () => void }): Menu {
  const root = new Container();

  // §9: Playfair Display carries the club-table title
  const heading = new Text({
    text: options.title,
    style: { fill: 0xf2e8dc, fontFamily: FONTS.display, fontWeight: '600' },
  });
  heading.anchor.set(0.5);

  const button = new Container();
  const plate = new Graphics();
  plate.roundRect(-160, -27, 320, 54, 27).fill(COLORS.cell);
  plate
    .moveTo(-118, -24.5)
    .lineTo(118, -24.5)
    .stroke({ width: 2, color: COLORS.cellLight, alpha: 0.6 });
  plate
    .moveTo(-118, 24)
    .lineTo(118, 24)
    .stroke({ width: 3, color: COLORS.cellDeep, alpha: 0.85 });
  plate.roundRect(-160, -27, 320, 54, 27).stroke({ width: 1.5, color: COLORS.brass, alpha: 0.8 });
  const label = new Text({
    text: STRINGS.menuPlay,
    style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '700' },
  });
  label.anchor.set(0.5);
  button.addChild(plate, label);
  button.eventMode = 'static';
  button.cursor = 'pointer';
  // §8 press: scale 0.96
  button.on('pointerdown', () => button.scale.set(0.96));
  const release = () => button.scale.set(1);
  button.on('pointerup', release);
  button.on('pointerupoutside', release);
  button.on('pointerleave', release);
  if (options.onPlay) button.on('pointertap', options.onPlay);

  root.addChild(heading, button);

  return {
    root,
    layout(width, height) {
      const shorter = Math.min(width, height);

      heading.style.fontSize = Math.max(28, Math.min(shorter * 0.1, 84));
      heading.position.set(width / 2, height * 0.42);
      button.position.set(width / 2, height * 0.42 + heading.height / 2 + shorter * 0.09);
    },
  };
}
