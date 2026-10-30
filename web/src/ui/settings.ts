import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { COLORS } from '../render/palette';
import { FONTS } from '../render/fonts';
import { LANGUAGES, t } from '../i18n';
import type { Language } from '../i18n';
import { attachKeyGroup, detachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import { createButton } from './widgets';
import type { Button } from './widgets';
import { drawCardPlate, fadeScrimIn, SCRIM_ALPHA, SCRIM_FILL } from './card';

export interface SettingsState {
  soundOn: boolean;
  language: Language;
}

export interface SettingsDialog {
  root: Container;
  group: KeyGroup;
  layout(width: number, height: number): void;
  refresh(state: SettingsState): void;
  attach(): void;
  detach(): void;
}

export interface SettingsHandlers {
  onToggleSound(next: boolean): void;
  onPickLanguage(next: Language): void;
  onClose(): void;
}

const CARD_HEIGHT = 330;
const ROW = { sound: -57, label: -2, langButtons: 44, close: 113 } as const;

/** Toggle-switch widget in Button shape (+1 to the key chain: the switch gets a focus ring). */
function createSwitchButton(initialOn: boolean, onToggle: () => void): Button {
  const root = new Container();
  const plate = new Graphics();
  const ring = new Graphics();
  root.addChild(plate, ring);
  root.eventMode = 'static';
  root.cursor = 'pointer';
  root.hitArea = new Rectangle(-36, -26, 72, 52);

  let on = initialOn;
  let focused = false;

  const draw = (): void => {
    plate.clear();
    plate.roundRect(-32, -16, 64, 32, 16).fill(on ? COLORS.brass : 0x6b5a48);
    plate.circle(on ? 14 : -14, 0, 11).fill(0xf2ead8);
    ring.clear();
    if (focused) {
      ring.roundRect(-42, -26, 84, 52, 17).stroke({ width: 3, color: COLORS.brassLight, alpha: 0.95 });
    }
  };

  root.on('pointerdown', () => root.scale.set(0.96));
  const release = () => root.scale.set(1);
  root.on('pointerup', release);
  root.on('pointerupoutside', release);
  root.on('pointerleave', release);
  root.on('pointertap', () => {
    on = !on;
    draw();
    onToggle();
  });

  draw();

  return {
    root,
    setLabel() {
      // the switch is square-free: no label
    },
    setFont() {},
    setSize() {},
    setFocused(value) {
      if (focused === value) return;
      focused = value;
      draw();
    },
    isFocused: () => focused,
    activate: () => {
      on = !on;
      draw();
      onToggle();
    },
  };
}

/** §7.6 settings card: sound toggle and a language switch in self-named languages. */
export function createSettingsScreen(initial: SettingsState, handlers: SettingsHandlers): SettingsDialog {
  const root = new Container();
  const dim = new Graphics();
  const card = new Graphics();
  const title = new Text({
    text: '',
    style: { fill: 0xf2e8dc, fontFamily: FONTS.display, fontWeight: '600' },
  });
  title.anchor.set(0.5);
  const content = new Container();
  root.addChild(dim, card, title, content);

  let current = initial;
  let cardWidth = 340;
  let cardHeight = CARD_HEIGHT;
  let baseFont = 16;
  let tiles: Button[] = [];

  const group: KeyGroup = {
    root,
    focusable: () => tiles,
    onEscape: () => handlers.onClose(),
  };

  // tap-outside-the-card closes the settings, same as Escape
  let tapPoint = { x: 0, y: 0 };
  root.on('pointertap', (event) => {
    tapPoint = event.getLocalPosition(root);
    if (Math.abs(tapPoint.x) > cardWidth / 2 || Math.abs(tapPoint.y) > cardHeight / 2) handlers.onClose();
  });

  function render(): void {
    tiles = [];
    content.removeChildren();
    title.text = t('settings.title');

    // sound
    const soundSwitch = createSwitchButton(current.soundOn, () => {
      current = { ...current, soundOn: !current.soundOn };
      handlers.onToggleSound(current.soundOn);
    });
    soundSwitch.root.position.set(cardWidth / 2 - 28 - 36, 0);

    const row = new Container();
    row.position.set(0, ROW.sound);
    const soundLabel = new Text({
      text: t('settings.sound'),
      style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '700', fontSize: Math.round(baseFont * 1.15) },
    });
    soundLabel.anchor.set(0, 0.5);
    soundLabel.position.set(-cardWidth / 2 + 28, 0);
    // the tap zone stops short of the switch: a switch tap must not toggle twice via bubbling
    const tapZone = new Container();
    tapZone.eventMode = 'static';
    tapZone.cursor = 'pointer';
    tapZone.hitArea = new Rectangle(-cardWidth / 2 + 16, -26, cardWidth - 80, 52);
    tapZone.on('pointertap', () => soundSwitch.activate());
    row.addChild(tapZone, soundLabel, soundSwitch.root);
    content.addChild(row);
    tiles.push(soundSwitch);

    // language
    const langLabel = new Text({
      text: t('settings.language'),
      style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '700', fontSize: baseFont },
    });
    langLabel.anchor.set(0.5);
    langLabel.position.set(0, ROW.label);
    content.addChild(langLabel);
    // two half-width buttons with a 14 px gap; centers mirror around the card axis
    let offset = -(cardWidth - 56 - 14) / 4 - 7;
    for (const language of LANGUAGES) {
      const button = createButton(t(language === 'ru' ? 'settings.langRU' : 'settings.langEn'), {
        kind: 'secondary',
        width: (cardWidth - 56 - 14) / 2,
        height: 46,
        onTap: () => {
          if (current.language === language) return;
          current = { ...current, language };
          handlers.onPickLanguage(language);
          render();
        },
      });
      button.setFont(baseFont);
      button.setFocused(current.language === language);
      button.root.position.set(offset, ROW.langButtons);
      offset = -offset;
      content.addChild(button.root);
      tiles.push(button);
    }

    // close
    const closing = createButton(t('common.close'), {
      kind: 'primary',
      width: cardWidth - 56,
      height: 52,
      onTap: () => handlers.onClose(),
    });
    closing.setFont(Math.round(baseFont * 1.15));
    closing.root.position.set(0, ROW.close);
    content.addChild(closing.root);
    tiles.push(closing);
  }

  render();

  return {
    root,
    group,
    layout(width, height) {
      const isPortrait = height >= width;
      baseFont = isPortrait ? 16 : 17;
      cardWidth = Math.round(isPortrait ? Math.min(width - 40, 340) : 460);
      title.style.fontSize = Math.round(baseFont * 2);
      title.position.set(0, -CARD_HEIGHT / 2 + 26 + 17);
      dim
        .clear()
        .rect(-width / 2, -height / 2, width, height)
        .fill({ color: SCRIM_FILL, alpha: SCRIM_ALPHA });
      root.position.set(width / 2, height / 2);
      root.eventMode = 'static'; // the scrim itself swallows menu taps
      root.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
      drawCardPlate(card, cardWidth, CARD_HEIGHT);
      render();
    },
    refresh(state) {
      current = state;
      if (root.parent !== null) render();
    },
    attach: () => {
      attachKeyGroup(group);
      fadeScrimIn(dim);
    },
    detach: () => detachKeyGroup(group),
  };
}
