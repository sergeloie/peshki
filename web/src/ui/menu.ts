import { Container, Sprite, Text } from 'pixi.js';
import { FONTS } from '../render/fonts';
import { t } from '../i18n';
import type { StringKey } from '../i18n';
import { attachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import { createButton } from './widgets';
import type { Button, ButtonKind } from './widgets';
import { sharedTextures } from '../render/table-surface';

export interface MenuOptions {
  onPlay?: () => void;
  /** Optional resume entry point: ticket #16 builds the autosave that feeds it. */
  onContinue?: () => void;
  onHowto?: () => void;
  onSettings?: () => void;
}

export interface Menu {
  root: Container;
  layout(width: number, height: number): void;
  group: KeyGroup;
  /** Resume entry point: hidden when no unfinished match is stored. */
  setContinueVisible(visible: boolean): void;
}

export function createMenu(options: MenuOptions): Menu {
  const root = new Container();

  // §9: Playfair Display carries the club-table title; every label travels with layout()
  const heading = new Text({
    text: '',
    style: { fill: 0xf2e8dc, fontFamily: FONTS.display, fontWeight: '600' },
  });
  heading.anchor.set(0.5);

  // #8 deferred cosmetics: anchor for the empty bottom — the club crest engraved
  // into the table below the buttons, half sunk past the lower edge
  const crest = new Sprite({ texture: sharedTextures().medallion });
  crest.anchor.set(0.5, 1);
  crest.alpha = 0.14;

  interface Entry {
    button: Button;
    labelKey: StringKey;
    height: number;
  }

  const entries: Entry[] = [];
  const push = (labelKey: StringKey, kind: ButtonKind, height: number, onTap?: () => void): void => {
    if (onTap === undefined) return;
    entries.push({ button: createButton(t(labelKey), { kind, width: 340, height, onTap }), labelKey, height });
  };

  push('pause.resume', 'secondary', 52, options.onContinue);
  push('menu.play', 'primary', 56, options.onPlay);
  push('menu.howto', 'secondary', 52, options.onHowto);
  push('menu.settings', 'secondary', 52, options.onSettings);

  const buttons = entries.map((entry) => entry.button);
  const group: KeyGroup = { root, focusable: () => buttons.filter((button) => button.root.visible) };
  for (const button of buttons) {
    root.addChild(button.root);
  }
  root.addChild(heading);
  root.addChildAt(crest, 0); // the crest lies under everything
  attachKeyGroup(group);

  return {
    root,
    group,
    setContinueVisible(visible) {
      const entry = entries[0];
      if (entry === undefined || entry.labelKey !== 'pause.resume') return;
      entry.button.root.visible = visible;
    },
    layout(viewWidth, viewHeight) {
      heading.text = t('app.title');
      const shorter = Math.min(viewWidth, viewHeight);

      heading.style.fontSize = Math.max(28, Math.min(shorter * 0.1, 84));
      heading.position.set(viewWidth / 2, viewHeight * 0.24);

      // crest: large, quiet, half below the edge — the bottom ~40% is no longer dead
      const crestSize = shorter * 0.8;
      crest.width = crestSize;
      crest.height = crestSize;
      crest.position.set(viewWidth / 2, viewHeight + crestSize * 0.22);

      const buttonWidth = Math.min(340, shorter * 0.82);
      const fontSize = Math.round(Math.max(17, Math.min(shorter * 0.032, 21)));
      let y = viewHeight * 0.24 + heading.height / 2 + shorter * 0.12;
      for (const entry of entries) {
        if (!entry.button.root.visible) continue;
        entry.button.setLabel(t(entry.labelKey));
        entry.button.setSize(buttonWidth, entry.height);
        entry.button.root.position.set(viewWidth / 2, y);
        entry.button.setFont(fontSize);
        y += entry.height / 2 + shorter * 0.095;
      }
    },
  };
}
