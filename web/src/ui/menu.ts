import { Container, Graphics, Text } from 'pixi.js';

const TABLE = 0x2e1710;
const BRASS = 0xc9a227;
const IVORY = 0xf2ead8;
const ENGRAVED = 0x2a140d;
const FONT = 'Georgia, "Times New Roman", serif';

export interface Menu {
  root: Container;
  layout(width: number, height: number): void;
}

export function createMenu(options: { title: string; onPlay?: () => void }): Menu {
  const root = new Container();
  const surface = new Graphics();
  const heading = new Text({
    text: options.title,
    style: { fill: IVORY, fontFamily: FONT, fontWeight: '600' },
  });
  heading.anchor.set(0.5);

  const button = new Container();
  const plate = new Graphics();
  const label = new Text({ text: 'Играть', style: { fill: ENGRAVED, fontFamily: FONT, fontWeight: '700' } });
  label.anchor.set(0.5);
  button.addChild(plate, label);
  button.eventMode = 'static';
  button.cursor = 'pointer';
  if (options.onPlay) button.on('pointertap', options.onPlay);

  root.addChild(surface, heading, button);

  return {
    root,
    layout(width, height) {
      const shorter = Math.min(width, height);

      surface.clear().rect(0, 0, width, height).fill(TABLE);
      heading.style.fontSize = Math.max(28, Math.min(shorter * 0.1, 84));
      heading.position.set(width / 2, height * 0.42);

      const buttonWidth = Math.min(width * 0.6, 360);
      const buttonHeight = Math.max(56, Math.min(buttonWidth * 0.26, 96));
      plate.clear().roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonHeight / 2).fill(BRASS);
      label.style.fontSize = Math.round(buttonHeight * 0.4);
      button.position.set(width / 2, height * 0.42 + heading.height / 2 + shorter * 0.09);
    },
  };
}
