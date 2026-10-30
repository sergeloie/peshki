import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { COLORS } from '../render/palette';
import { FONTS } from '../render/fonts';
import { attachKeyGroup, detachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import { createButton } from './widgets';
import type { Button } from './widgets';
import { drawCardPlate } from './card';

export interface DialogAction {
  label: string;
  primary?: boolean;
  onTap: () => void;
}

export interface DialogOptions {
  title: string;
  /** Optional small brass line above the body (how-to page captions). */
  label?: string | null;
  /** Wrapped body paragraph; hidden when null. */
  body?: string | null;
  actions: readonly DialogAction[];
}

export interface Dialog {
  root: Container;
  group: KeyGroup;
  layout(width: number, height: number): void;
  set(options: DialogOptions): void;
  /** Pushes its key group; call when the dialog goes on the stage. */
  attach(): void;
  detach(): void;
}

/** §7 modal card: dim 0.7 over the board, dark card, brass edge, stacked buttons. */
export function createDialog(options: DialogOptions): Dialog {
  const root = new Container();
  const dim = new Graphics();
  const card = new Graphics();
  const title = new Text({
    text: '',
    style: { fill: 0xf2e8dc, fontFamily: FONTS.display, fontWeight: '600' },
  });
  title.anchor.set(0.5);
  const caption = new Text({
    text: '',
    style: { fill: COLORS.brassLight, fontFamily: FONTS.body, fontWeight: '700' },
  });
  caption.anchor.set(0.5);
  const body = new Text({
    text: '',
    style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '400', wordWrap: true, breakWords: true, align: 'center' },
  });
  body.anchor.set(0.5);
  const host = new Container();
  root.addChild(dim, card, title, caption, body, host);

  let current = options;
  let cardWidth = 340;
  let cardHeight = 320;
  let baseFont = 16;
  let buttons: Button[] = [];

  const group: KeyGroup = { root, focusable: () => buttons, onEscape: undefined };

  function render(): void {
    title.text = current.title;
    caption.text = current.label ?? '';
    caption.visible = current.label != null;
    body.text = current.body ?? '';
    body.visible = current.body != null;

    host.removeChildren();
    buttons = current.actions.map((action, index) => {
      const button = createButton(action.label, {
        kind: action.primary || (current.actions.length === 1 && index === 0) ? 'primary' : 'secondary',
        width: cardWidth - 56,
        height: 52,
        onTap: action.onTap,
      });
      button.setFont(Math.round(baseFont * 1.15));
      return button;
    });
    const stackHeight = buttons.length * 52 + Math.max(0, buttons.length - 1) * 14;
    const titleHeight = title.height + 8;
    const captionHeight = caption.visible ? caption.height + 10 : 0;
    const bodyHeight = body.visible ? body.height + 14 : 0;
    cardHeight = 28 + titleHeight + captionHeight + bodyHeight + 16 + stackHeight + 26;

    title.position.set(0, -cardHeight / 2 + 28 + titleHeight / 2);
    caption.position.set(0, title.y + titleHeight / 2 + (caption.visible ? caption.height / 2 + 10 : 0));
    body.position.set(
      0,
      caption.y + (caption.visible ? caption.height / 2 : 0) + 14 + bodyHeight / 2,
    );

    let y = cardHeight / 2 - 26 - 26;
    for (let index = buttons.length - 1; index >= 0; index -= 1) {
      buttons[index].root.position.set(0, y);
      buttons[index].setSize(cardWidth - 56, 52);
      host.addChild(buttons[index].root);
      y -= 66;
    }
    drawCardPlate(card, cardWidth, cardHeight);
  }

  return {
    root,
    group,
    layout(width, height) {
      const isPortrait = height >= width;
      baseFont = isPortrait ? 16 : 17;
      cardWidth = Math.round(isPortrait ? Math.min(width - 40, 340) : 460);
      title.style.fontSize = Math.round(baseFont * 2);
      caption.style.fontSize = baseFont;
      body.style.fontSize = Math.round(baseFont * 1.12);
      body.style.wordWrapWidth = cardWidth - 64;
      dim.clear().rect(0, 0, width, height).fill({ color: COLORS.panel, alpha: 0.7 });
      root.position.set(width / 2, height / 2);
      root.eventMode = 'static'; // the dim itself swallows board taps
      root.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
      render();
    },
    set(next) {
      current = next;
      render();
    },
    attach() {
      attachKeyGroup(group);
    },
    detach() {
      detachKeyGroup(group);
    },
  };
}
