import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { COLORS } from '../render/palette';
import { FONTS } from '../render/fonts';
import { t } from '../i18n';
import { attachKeyGroup, detachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import { createButton } from './widgets';
import type { GameLayout } from '../render/hud';
import { getSafeArea } from '../render/hud';

export interface TutorialBanner {
  root: Container;
  layout(width: number, height: number, game: GameLayout): void;
  /** Shows one concept line; a re-show replaces the text. */
  show(text: string): void;
  hide(): void;
  /** Dialog rule: the hint strip must not look tappable behind a scrim. */
  setSuppressed(value: boolean): void;
}

/**
 * First-game hint: one board strip per concept, dismissed with common.ok,
 * persisted through the progress blob by the caller.
 */
export function createTutorialBanner(onDismiss: () => void): TutorialBanner {
  const root = new Container();
  root.eventMode = 'static';
  root.visible = false;

  const plate = new Graphics();
  const text = new Text({
    text: '',
    style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '400', wordWrap: true, breakWords: true },
  });
  const button = createButton(t('common.ok'), { kind: 'primary', width: 168, height: 46, onTap: onDismiss });
  const group: KeyGroup = { root, focusable: () => [button], onEscape: onDismiss };
  const surface: { width: number; height: number; game: GameLayout | null } = { width: 0, height: 0, game: null };

  root.addChild(plate, text, button.root);

  function place(): void {
    const { width, height, game } = surface;
    if (game === null || width === 0) return;
    const portrait = game.orientation === 'portrait';
    const bannerWidth = Math.min(width - 24, portrait ? 300 : 430);
    const pad = 14;
    text.style.fontSize = game.baseFont + 1;
    if (portrait) {
      text.anchor.set(0, 0);
      // stack: text line(s) over the ack button
      text.style.wordWrapWidth = bannerWidth - pad * 2;
      const bannerHeight = pad * 2 + text.height + 12 + 46;
      const trayPad = game.isTv ? 1.5 : 1;
      const bottom = Math.max(Math.round(8 * trayPad), getSafeArea().bottom); // §7 safe-area env
      const y = height - bottom - Math.round(224 * trayPad) - bannerHeight / 2 - 8;
      root.position.set(width / 2, y);
      text.position.set(-bannerWidth / 2 + pad, -bannerHeight / 2 + pad);
      button.root.position.set(0, bannerHeight / 2 - pad - 23);
      root.hitArea = new Rectangle(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight);
      plate.clear();
      plate.roundRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 16).fill({ color: 0x241511, alpha: 0.96 });
      plate
        .roundRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 16)
        .stroke({ width: 1, color: COLORS.brass, alpha: 0.8 });
      return;
    }

    // landscape: text left, ack button right, just above the bottom board edge
    text.anchor.set(0, 0.5);
    text.style.wordWrapWidth = bannerWidth - pad * 2 - 180;
    const landscapeHeight = Math.max(text.height, 46) + pad * 2;
    root.position.set(game.board.x + game.board.size / 2, height - 110);
    text.position.set(-bannerWidth / 2 + pad, 0);
    button.root.position.set(bannerWidth / 2 - pad - 84, 0);
    root.hitArea = new Rectangle(-bannerWidth / 2, -landscapeHeight / 2, bannerWidth, landscapeHeight);
    plate.clear();
    plate
      .roundRect(-bannerWidth / 2, -landscapeHeight / 2, bannerWidth, landscapeHeight, 16)
      .fill({ color: 0x241511, alpha: 0.96 });
    plate
      .roundRect(-bannerWidth / 2, -landscapeHeight / 2, bannerWidth, landscapeHeight, 16)
      .stroke({ width: 1, color: COLORS.brass, alpha: 0.8 });
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
      if (root.visible) place();
    },
    show(next) {
      text.text = next;
      shown = true;
      applyVisibility();
      if (!attached) {
        attached = true;
        attachKeyGroup(group);
      }
      place();
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
