import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { FONTS } from '../render/fonts';
import { t } from '../i18n';
import { attachKeyGroup, detachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import { createButton } from './widgets';
import { drawCardPlate, fadeScrimIn, SCRIM_ALPHA, SCRIM_FILL } from './card';
import type { GameLayout } from '../render/hud';

export interface TutorialBanner {
  root: Container;
  layout(width: number, height: number, game: GameLayout): void;
  /** Shows one concept line; a re-show replaces the text. */
  show(text: string): void;
  hide(): void;
  /** Dialog rule: the hint card must not look tappable behind a scrim. */
  setSuppressed(value: boolean): void;
}

/**
 * First-game hint, one concept per dismissal. #8 review round 2: the old board
 * strip sat across the cells it explains — the hint is now a centred
 * dialog-language card over a scrim and never touches the playing field.
 */
export function createTutorialBanner(onDismiss: () => void): TutorialBanner {
  const root = new Container();
  root.eventMode = 'static';
  root.visible = false;

  const scrim = new Graphics();
  const plate = new Graphics();
  const text = new Text({
    text: '',
    style: {
      fill: 0xf2e8dc,
      fontFamily: FONTS.body,
      fontWeight: '400',
      wordWrap: true,
      breakWords: true,
      align: 'center',
    },
  });
  text.anchor.set(0.5, 0);
  const button = createButton(t('common.ok'), { kind: 'primary', width: 168, height: 46, onTap: onDismiss });
  const group: KeyGroup = { root, focusable: () => [button], onEscape: onDismiss };
  const surface: { width: number; height: number; game: GameLayout | null } = { width: 0, height: 0, game: null };

  root.addChild(scrim, plate, text, button.root);

  function place(): void {
    const { width, height, game } = surface;
    if (game === null || width === 0) return;
    // §9 floor: body text never drops below 14 px, portrait phone stays at baseFont
    const bodyFont = Math.max(game.baseFont, 14);
    const cardWidth = Math.round(game.orientation === 'portrait' ? Math.min(width - 40, 340) : 460);
    text.style.fontSize = bodyFont;
    text.style.wordWrapWidth = cardWidth - 64;
    const cardHeight = Math.round(28 + text.height + 18 + 46 + 26);

    scrim
      .clear()
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: SCRIM_FILL, alpha: SCRIM_ALPHA });
    drawCardPlate(plate, cardWidth, cardHeight);
    root.position.set(width / 2, height / 2);
    root.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
    text.position.set(0, -cardHeight / 2 + 28);
    button.root.position.set(0, cardHeight / 2 - 26 - 23);
  }

  let attached = false;
  let shown = false;
  let suppressed = false;

  function applyVisibility(): void {
    root.visible = shown && !suppressed;
  }

  return {
    root,
    setSuppressed(value) {
      suppressed = value;
      applyVisibility();
    },
    layout(width, height, game) {
      surface.width = width;
      surface.height = height;
      surface.game = game;
      if (shown) place();
    },
    show(next) {
      text.text = next;
      shown = true;
      applyVisibility();
      place();
      if (!attached) {
        attached = true;
        attachKeyGroup(group);
      }
      fadeScrimIn(scrim);
    },
    hide() {
      shown = false;
      applyVisibility();
      if (attached) {
        attached = false;
        detachKeyGroup(group);
      }
    },
  };
}
