import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import { COLORS } from '../render/palette';
import { FONTS } from '../render/fonts';
import { attachKeyGroup, detachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import { createButton } from './widgets';
import type { Button } from './widgets';
import { drawCardPlate, fadeScrimIn, SCRIM_ALPHA, SCRIM_FILL } from './card';

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
  /** Optional small mono footnote (page indicators); drawn above the buttons. */
  footer?: string | null;
  actions: readonly DialogAction[];
}

export interface Dialog {
  root: Container;
  group: KeyGroup;
  layout(width: number, height: number): void;
  set(options: DialogOptions): void;
  /** Pushes its key group and fades the scrim; call when the dialog goes on the stage. */
  attach(): void;
  detach(): void;
}

/** §7 modal card: scrim 0.72 over the board, dark card, brass edge, stacked buttons. */
export function createDialog(options: DialogOptions): Dialog {
  const root = new Container();
  const scrim = new Graphics();
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
  const footer = new Text({
    text: '',
    style: { fill: COLORS.ivoryDeep, fontFamily: FONTS.mono, fontWeight: '400' },
  });
  footer.anchor.set(0, 0.5);
  const host = new Container();
  root.addChild(scrim, card, title, caption, body, footer, host);

  let current = options;
  let cardWidth = 340;
  let cardHeight = 320;
  let baseFont = 16;
  let buttons: Button[] = [];

  const group: KeyGroup = { root, focusable: () => buttons, onEscape: undefined };

  // tap-outside-the-card is the same gesture as Escape: "not on the card" closes
  root.on('pointertap', (event: FederatedPointerEvent) => {
    const point = event.getLocalPosition(root);
    const outside =
      Math.abs(point.x) > cardWidth / 2 ||
      Math.abs(point.y) > cardHeight / 2;
    if (outside) group.onEscape?.();
  });

  function render(): void {
    title.text = current.title;
    caption.text = current.label ?? '';
    caption.visible = current.label != null;
    body.text = current.body ?? '';
    body.visible = current.body != null;
    footer.text = current.footer ?? '';
    footer.visible = current.footer != null;

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
    const captionHeight = caption.visible ? caption.height + 10 : 0;
    const bodyHeight = body.visible ? body.height + 14 : 0;
    const footerHeight = footer.visible ? footer.height : 0;
    const gapToStack = 16;
    cardHeight = 28 + title.height + 8 + captionHeight + bodyHeight + footerHeight + gapToStack + stackHeight + 26;

    let y = -cardHeight / 2 + 28;
    title.position.set(0, y + title.height / 2);
    y += title.height + 8;
    if (caption.visible) {
      y += 10;
      caption.position.set(0, y + caption.height / 2);
      y += caption.height;
    }
    if (body.visible) {
      y += 14;
      body.position.set(0, y + body.height / 2);
      y += body.height;
    }
    if (footer.visible) {
      y += 16;
      footer.position.set(-cardWidth / 2 + 28, y + footer.height / 2);
      y += footer.height;
    }

    let bottom = cardHeight / 2 - 26 - 26;
    for (let index = buttons.length - 1; index >= 0; index -= 1) {
      buttons[index].root.position.set(0, bottom);
      buttons[index].setSize(cardWidth - 56, 52);
      host.addChild(buttons[index].root);
      bottom -= 66;
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
      footer.style.fontSize = Math.round(baseFont - 3);
      scrim
        .clear()
        .rect(-width / 2, -height / 2, width, height)
        .fill({ color: SCRIM_FILL, alpha: SCRIM_ALPHA });
      root.position.set(width / 2, height / 2);
      root.eventMode = 'static'; // the scrim itself swallows every tap
      root.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
      render();
    },
    set(next) {
      current = next;
    render();
    },
    attach() {
      attachKeyGroup(group);
      fadeScrimIn(scrim);
    },
    detach() {
      detachKeyGroup(group);
    },
  };
}
