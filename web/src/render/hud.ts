import { CanvasSource, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { COLORS, PLAYERS } from './palette';
import { FONTS } from './fonts';
import type { GameTextures } from './textures';
import { STRINGS } from '../ui/strings';

export interface PlayerChipState {
  playerIndex: number;
  name: string;
  benchCount: number;
  active: boolean;
}

export interface HudState {
  dice: number[];
  remaining: number[];
  canRoll: boolean;
  sumLabel: string | null;
  message: string | null;
  players: PlayerChipState[];
}

/** §7 board placement: square, scaled by the smaller free side. */
export interface GameLayout {
  orientation: 'portrait' | 'landscape';
  isTv: boolean;
  /** §9 typography base: 16 phone, 17 tablet, 18 desktop, 20 TV. */
  baseFont: number;
  board: { x: number; y: number; size: number };
}

const TV_PAD = 1.5;
const DICE_PULSE_MS = 1600;
/** Resting faces for the tray before the first roll (§6 has no pre-roll state). */
const IDLE_DICE = [3, 5];
const PIP_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

export function computeGameLayout(width: number, height: number): GameLayout {
  const isTv = Math.max(width, height) >= 1600;
  const pad = isTv ? TV_PAD : 1;
  const short = Math.min(width, height);
  // §9: 16 phone, 17 tablet, 18 desktop, 20 TV minimum
  const baseFont = isTv ? 20 : short >= 900 ? 18 : short >= 600 ? 17 : 16;

  if (width >= height) {
    // §7.3.1: fixed side panel, square board left; board never stretches
    const panelWidth = Math.round(380 * pad);
    const margin = 12 * pad;
    const size = Math.min(height - 2 * margin, width - panelWidth - 3 * margin);
    return {
      orientation: 'landscape',
      isTv,
      baseFont,
      board: {
        x: Math.max(margin / 2, (width - panelWidth - size) / 2),
        y: (height - size) / 2,
        size,
      },
    };
  }

  // §7.3: player chips on top (72 px: breathing room), dice tray at the bottom
  const topBar = Math.round(72 * pad);
  const tray = Math.round(224 * pad);
  const margin = 8 * pad;
  const size = Math.min(width - 2 * margin, height - topBar - tray - 2 * margin);
  // the board centres in whatever height is left over — no dead wood strip
  return {
    orientation: 'portrait',
    isTv,
    baseFont,
    board: { x: (width - size) / 2, y: topBar + Math.max(0, (height - topBar - tray - size) / 2), size },
  };
}

export interface HudView {
  root: Container;
  layout(width: number, height: number, geometry: GameLayout): void;
  update(state: HudState): void;
  /** §6 unspent-die pulse; drive from a ticker with delta ms. */
  tick(elapsedMs: number): void;
}

interface ChipView {
  playerIndex: number;
  sprite: Sprite;
  pos: { x: number; y: number };
  /** cached row content so update() re-bakes only when it changes */
  baked: string;
}

/** landscape row height, portrait top-bar chip height (design px, ×TV pad). */
const ROW_HEIGHT_LANDSCAPE = 56;
const ROW_HEIGHT_PORTRAIT = 48;

function chipRowCanvas(
  look: (typeof PLAYERS)[number],
  state: PlayerChipState | undefined,
  plateWidth: number,
  plateHeight: number,
  withName: boolean,
): HTMLCanvasElement {
  const s = 2; // 2× supersample like the pawn art
  const el = document.createElement('canvas');
  el.width = plateWidth * s;
  el.height = plateHeight * s;
  const ctx = el.getContext('2d')!;
  ctx.scale(s, s);

  const active = state?.active ?? false;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, plateWidth - 1, plateHeight - 1, plateHeight / 2);
  ctx.fillStyle = active ? 'rgba(80,48,24,0.94)' : 'rgba(42,20,13,0.94)';
  ctx.fill();
  ctx.lineWidth = active ? 2.5 : 1;
  ctx.strokeStyle = active ? 'rgba(201,162,39,0.95)' : 'rgba(201,162,39,0.45)';
  ctx.stroke();

  // engraved player symbol
  const symbolX = 18;
  const symbolSize = Math.min(16, plateHeight * 0.34);
  const drawSymbol = (pass: 'dark' | 'light', dx: number, dy: number): void => {
    ctx.fillStyle = pass === 'dark' ? hexaCss(look.color, 1) : hexaCss(look.light, 0.8);
    ctx.strokeStyle = ctx.fillStyle;
    const cx = symbolX + dx + symbolSize / 2;
    const cy = plateHeight / 2 + dy;
    const r = symbolSize / 2;
    switch (look.symbol) {
      case 'disc':
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); break;
      case 'ring':
        ctx.lineWidth = symbolSize * 0.22; ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); ctx.stroke(); break;
      case 'diamond':
        ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.4); ctx.lineTo(cx + r * 1.4, cy); ctx.lineTo(cx, cy + r * 1.4); ctx.lineTo(cx - r * 1.4, cy); ctx.closePath(); ctx.fill(); break;
      case 'square':
        ctx.fillRect(cx - r * 1.15, cy - r * 1.15, r * 2.3, r * 2.3); break;
    }
  };
  drawSymbol('light', 0.8, 1.2);
  drawSymbol('dark', 0, 0);

  // §9: ivory text, PT Sans for the name, PT Mono for the counter
  ctx.textBaseline = 'middle';
  if (withName && state !== undefined) {
    ctx.fillStyle = '#fff6e6';
    ctx.font = `700 20px "PT Sans", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(state.name, 34, plateHeight / 2 - plateHeight * 0.02);
  }
  if (state !== undefined && state.benchCount > 0) {
    ctx.fillStyle = '#f3d77b';
    ctx.font = `20px "PT Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`x${state.benchCount}`, plateWidth - 12, plateHeight / 2 - plateHeight * 0.02);
  }
  return el;
}

function hexaCss(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff},${alpha})`;
}

export function createHud(textures: GameTextures, handlers: { onRoll(): void; onSum(): void }): HudView {
  const root = new Container();

  const topPanel = new Graphics();
  const trayPanel = new Graphics();
  const sidePanel = new Graphics();
  const diceShadows = new Container();
  const diceLayer = new Graphics();
  const dicePulse = new Graphics();

  const chips: ChipView[] = PLAYERS.map((_, playerIndex) => {
    const sprite = new Sprite();
    sprite.anchor.set(0.5, 0.5);
    sprite.visible = false;
    return { playerIndex, sprite, pos: { x: 0, y: 0 }, baked: '' };
  });

  const sumChip = new Container();
  const sumPlate = new Graphics();
  const sumLabel = new Text({ text: '', style: { fill: 0xf2e8dc, fontFamily: FONTS.mono } });
  sumLabel.anchor.set(0.5);
  sumChip.addChild(sumPlate, sumLabel);
  sumChip.eventMode = 'static';
  sumChip.cursor = 'pointer';
  sumChip.on('pointertap', handlers.onSum);

  const message = new Text({
    text: '',
    style: { fill: COLORS.brassLight, fontFamily: FONTS.body, fontWeight: '700' },
  });
  message.anchor.set(0.5);

  const rollButton = new Container();
  const rollPlate = new Graphics();
  const rollLabel = new Text({
    text: STRINGS.gameThrow,
    style: { fill: 0xf2e8dc, fontFamily: FONTS.body, fontWeight: '700' },
  });
  rollLabel.anchor.set(0.5);
  rollButton.addChild(rollPlate, rollLabel);
  rollButton.eventMode = 'static';
  rollButton.cursor = 'pointer';
  rollButton.on('pointertap', handlers.onRoll);
  // §8 press: scale 0.96
  rollButton.on('pointerdown', () => rollButton.scale.set(0.96));
  const release = () => rollButton.scale.set(1);
  rollButton.on('pointerup', release);
  rollButton.on('pointerupoutside', release);
  rollButton.on('pointerleave', release);

  root.addChild(
    topPanel,
    trayPanel,
    sidePanel,
    diceShadows,
    diceLayer,
    dicePulse,
    sumChip,
    message,
    rollButton,
    // player rows last: the panels must not cover the list or the top bar
    ...chips.map((chip) => chip.sprite),
  );

  let geometry: GameLayout | null = null;
  let width = 0;
  let height = 0;
  let dice: Array<{ x: number; y: number; size: number }> = [];
  let remaining: number[] = [];
  let pulse = 0;
  let sumWidth = 150;

  /** §2 primary button: wood face, #BF8B52 sheen, #40200F drop. */
  function drawPrimaryPlate(plate: Graphics, plateWidth: number, plateHeight: number): void {
    plate.roundRect(-plateWidth / 2, -plateHeight / 2, plateWidth, plateHeight, plateHeight / 2).fill(COLORS.cell);
    plate
      .moveTo(-plateWidth / 2 + plateHeight / 2, -plateHeight / 2 + 2.2)
      .lineTo(plateWidth / 2 - plateHeight / 2, -plateHeight / 2 + 2.2)
      .stroke({ width: 2, color: COLORS.cellLight, alpha: 0.6 });
    plate
      .moveTo(-plateWidth / 2 + plateHeight / 2, plateHeight / 2 - 3)
      .lineTo(plateWidth / 2 - plateHeight / 2, plateHeight / 2 - 3)
      .stroke({ width: 3, color: 0x40200f, alpha: 0.85 });
    plate
      .roundRect(-plateWidth / 2, -plateHeight / 2, plateWidth, plateHeight, plateHeight / 2)
      .stroke({ width: 1.5, color: COLORS.brass, alpha: 0.8 });
  }

  function chipLook(playerIndex: number) {
    return PLAYERS[playerIndex];
  }

  /** Re-bake a player row onto its canvas texture when its content changed. */
  function bakeChip(chip: ChipView, state: PlayerChipState | undefined, plateWidth: number, plateHeight: number): void {
    chip.sprite.position.set(chip.pos.x, chip.pos.y);
    const withName = geometry?.orientation !== 'portrait'; // §7.3 portrait chips carry no name
    const key = [
      chip.playerIndex,
      state?.name ?? '',
      state?.benchCount ?? -1,
      state?.active ? 1 : 0,
      Math.round(plateWidth),
      Math.round(plateHeight),
      withName ? 1 : 0,
    ].join('|');
    if (chip.baked === key) return;
    chip.baked = key;
    const look = chipLook(chip.playerIndex);
    const texture = new Texture({
      source: new CanvasSource({
        resource: chipRowCanvas(look, state, plateWidth, plateHeight, withName),
        resolution: 2,
      }),
    });
    chip.sprite.texture = texture;
    chip.sprite.width = plateWidth;
    chip.sprite.height = plateHeight;
    chip.sprite.visible = state !== undefined;
  }

/** Chip width is decided by orientation; the single source for plates and positions. */
function chipWidth(): number {
  if (geometry === null) return 120;
  const pad = geometry.isTv ? TV_PAD : 1;
  if (geometry.orientation === 'portrait') {
    return Math.min(148 * pad, (width - 10 * pad - 30 * pad) / 4);
  }
  return 340 * pad;
}

/** Arc stroke re-seeded from moveTo — Pixi v8 otherwise connects the current path point. */
function strokeArc(
  graphics: Graphics,
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  style: Parameters<Graphics['stroke']>[0],
): void {
  graphics.moveTo(x + Math.cos(startAngle) * radius, y + Math.sin(startAngle) * radius);
  graphics.arc(x, y, radius, startAngle, endAngle);
  graphics.stroke(style);
}

  function drawDiePlate(index: number, value: number, mode: 'unspent' | 'spent' | 'idle'): void {
    const die = dice[index];
    if (die === undefined) return;
    const unspent = mode === 'unspent';
    const idle = mode === 'idle';
    const { x, y, size } = die;
    const k = size / 96;
    const radius = 18 * k;
    // porcelain stays porcelain while resting (art review #6): full material,
    // muted pips, brass rim — never the spent putty-grey
    diceLayer.roundRect(x, y, size, size, radius).fill({ color: 0xf2ead8, alpha: idle ? 0.92 : unspent ? 1 : 0.45 });
    if (idle) {
      diceLayer
        .roundRect(x, y, size, size, radius)
        .stroke({ width: 2 * k, color: COLORS.brass, alpha: 0.55 });
    }
    // §3 height-fall: lit top edge, dark lower edge
    diceLayer
      .moveTo(x + radius * 0.8, y + 1.6 * k)
      .lineTo(x + size - radius * 0.8, y + 1.6 * k)
      .stroke({ width: 2 * k, color: 0xffffff, alpha: unspent ? 0.7 : 0.3 });
    diceLayer
      .moveTo(x + radius * 0.8, y + size - 2.2 * k)
      .lineTo(x + size - radius * 0.8, y + size - 2.2 * k)
      .stroke({ width: 3 * k, color: COLORS.engraved, alpha: unspent ? 0.28 : 0.15 });

    const pipRadius = 9 * k;
    const pipColor = unspent ? COLORS.engraved : COLORS.spentPip;
    const offset = size * 0.26;
    const cx = x + size / 2;
    const cy = y + size / 2;
    for (const [dx, dy] of PIP_POSITIONS[value] ?? []) {
      diceLayer.circle(cx + dx * offset, cy + dy * offset, pipRadius).fill({ color: pipColor, alpha: idle ? 0.66 : 1 });
      // light bevel on top of every pip (§6); v8 connects the current path
      // point to a new arc otherwise
      strokeArc(
        diceLayer,
        cx + dx * offset,
        cy + dy * offset,
        pipRadius * 0.86,
        Math.PI * 1.25,
        Math.PI * 1.85,
        { width: 2 * k, color: 0xffffff, alpha: idle ? 0.3 : unspent ? 0.4 : 0.18 },
      );
    }

    if (mode === 'spent') {
      diceLayer
        .moveTo(x + size * 0.7, y + size * 0.55)
        .lineTo(x + size * 0.78, y + size * 0.63)
        .lineTo(x + size * 0.9, y + size * 0.4)
        .stroke({ width: 3.5 * k, color: COLORS.brass });
    }
  }

  return {
    root,
    layout(nextWidth, nextHeight, next) {
      geometry = next;
      width = nextWidth;
      height = nextHeight;
      const { orientation, isTv, baseFont } = next;
      const pad = isTv ? TV_PAD : 1;

      topPanel.clear();
      trayPanel.clear();
      sidePanel.clear();
      diceShadows.removeChildren();
      dicePulse.clear();

      /* FONT sizes travel with the breakpoint (board table only)
      chips.forEach((chip) => {
        const scaleUp = geometry?.orientation === 'portrait' ? 0 : 3;
        chip.name.style.fontSize = baseFont + scaleUp;
        chip.count.style.fontSize = baseFont + scaleUp;
      }); */
      rollLabel.style.fontSize = Math.round(baseFont * 1.25);
      message.style.fontSize = baseFont + 1;
      sumLabel.style.fontSize = Math.round(baseFont * 1.05);

      const diceSize = Math.round((orientation === 'portrait' ? 96 : 88) * pad);
      const diceGap = Math.round((orientation === 'portrait' ? 24 : 16) * pad);

      if (orientation === 'portrait') {
        const topBar = Math.round(72 * pad);
        const trayHeight = Math.round(224 * pad);
        const trayTop = height - trayHeight;

        topPanel.rect(0, 0, width, topBar).fill({ color: COLORS.panel, alpha: 0.92 });
        topPanel
          .moveTo(0, topBar - 1)
          .lineTo(width, topBar - 1)
          .stroke({ width: 1, color: COLORS.brass, alpha: 0.3 });
        trayPanel.rect(0, trayTop, width, trayHeight).fill({ color: COLORS.panel, alpha: 0.92 });
        trayPanel
          .moveTo(0, trayTop)
          .lineTo(width, trayTop)
          .stroke({ width: 1, color: COLORS.brass, alpha: 0.3 });

        const rowWidth = diceSize * 2 + diceGap;
        const diceY = trayTop + 12 * pad;
        dice = [0, 1].map((index) => ({
          x: width / 2 - rowWidth / 2 + index * (diceSize + diceGap),
          y: diceY,
          size: diceSize,
        }));

        sumChip.position.set(width / 2, diceY + diceSize + 30 * pad);
        message.position.set(width / 2, diceY + diceSize + 30 * pad);
        rollButton.position.set(width / 2, height - 12 * pad - 26 * pad);
      }
      if (orientation === 'landscape') {
        const panelWidth = Math.round(380 * pad);
        const panelX = width - panelWidth;
        sidePanel.rect(panelX, 0, panelWidth, height).fill({ color: COLORS.panel, alpha: 0.92 });
        sidePanel.moveTo(panelX, 0).lineTo(panelX, height).stroke({ width: 1, color: COLORS.brass, alpha: 0.3 });

        // top block: dice pair → sum chip → roll → message
        const diceX = panelX + (panelWidth - diceSize) / 2;
        dice = [0, 1].map((index) => ({
          x: diceX,
          y: 20 * pad + index * (diceSize + diceGap),
          size: diceSize,
        }));
        sumChip.position.set(panelX + panelWidth / 2, dice[dice.length - 1].y + diceSize + 26 * pad);
        rollButton.position.set(panelX + panelWidth / 2, sumChip.y + 50 * pad);
        message.position.set(panelX + panelWidth / 2, rollButton.y + 46 * pad);

        // player list fills the rest at phone-readable row height (56 * pad)
        const rowHeight = 56 * pad;
        chips.forEach((chip, index) => {
          chip.pos = {
            x: panelX + 14 * pad + chipWidth() / 2,
            y: height - 24 * pad - rowHeight / 2 - (chips.length - 1 - index) * (rowHeight + 10 * pad),
          };
        });
      }

      if (orientation === 'portrait') {
        const cw = chipWidth();
        const totalRow = cw * 4 + 3 * 10 * pad;
        chips.forEach((chip, index) => {
          chip.pos = {
            x: (width - totalRow) / 2 + cw / 2 + index * (cw + 10 * pad),
            y: Math.round(36 * pad), // centred in the 72 * pad top bar
          };
        });
      }

      drawPrimaryPlate(rollPlate, orientation === 'portrait' ? Math.min(width - 24 * pad, 430 * pad) : 348 * pad, 52 * pad);

      // dice contact shadows, §3 (3,5) blur 12 alpha 0.35
      for (const { x, y, size } of dice) {
        const sprite = new Sprite({ texture: textures.shadow });
        sprite.width = size * 1.3;
        sprite.height = size * 0.72;
        sprite.position.set(x - size * 0.12 + 3, y + size - 12 + 5);
        sprite.alpha = 0.35;
        diceShadows.addChild(sprite);
      }
    },
    update(state) {
      remaining = [...state.remaining];
      diceLayer.clear();
      // §6: the physical dice always sit on the tray; before the first roll they
      // rest at half light so the primary interaction is never an empty tray
      if (state.dice.length === 0) {
        IDLE_DICE.forEach((value, index) => drawDiePlate(index, value, 'idle'));
      } else {
        state.dice.forEach((value, index) =>
          drawDiePlate(index, value, state.remaining.includes(value) ? 'unspent' : 'spent'),
        );
      }

      if (state.sumLabel !== null) {
        sumChip.visible = true;
        sumChip.eventMode = 'static';
        sumLabel.text = state.sumLabel;
        sumWidth = Math.max(150, sumLabel.width + 40);
        sumPlate.clear();
        sumPlate
          .roundRect(-sumWidth / 2, -24, sumWidth, 48, 24)
          .fill({ color: COLORS.panel, alpha: 0.94 });
        sumPlate
          .roundRect(-sumWidth / 2, -24, sumWidth, 48, 24)
          .stroke({ width: 2, color: COLORS.brass });
      } else {
        sumChip.visible = false;
        sumChip.eventMode = 'none';
      }

      message.visible = state.sumLabel === null && state.message !== null;
      if (message.visible) message.text = state.message as string;

      // player rows are baked canvas textures; content changes re-bake one row
      for (const chip of chips) {
        const player = state.players[chip.playerIndex];
        const pad = geometry?.isTv ? TV_PAD : 1;
        const rowHeight = ((geometry?.orientation ?? 'portrait') === 'portrait'
          ? ROW_HEIGHT_PORTRAIT
          : ROW_HEIGHT_LANDSCAPE) * pad;
        bakeChip(chip, player, chipWidth(), rowHeight);
      }

      rollButton.alpha = state.canRoll ? 1 : 0.45;
      rollButton.eventMode = state.canRoll ? 'static' : 'none';
    },
    tick(elapsedMs) {
      pulse += elapsedMs;
      dicePulse.clear();
      if (remaining.length === 0) return;
      const alpha = 0.4 + 0.4 * Math.sin((pulse / DICE_PULSE_MS) * Math.PI * 2);
      for (const die of dice) {
        dicePulse
          .roundRect(die.x, die.y, die.size, die.size, 18 * (die.size / 96))
          .stroke({ width: 2, color: COLORS.brassLight, alpha });
      }
    },
  };
}
