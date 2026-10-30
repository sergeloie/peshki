import { Container, Graphics, Text } from 'pixi.js';
import { COLORS } from './palette';

export const HUD_HEIGHT = 150;
const FONT = 'Georgia, "Times New Roman", serif';

export interface HudState {
  dice: number[];
  remaining: number[];
  canRoll: boolean;
  sumLabel: string | null;
  /** Seat on move, always shown so the hand-over is visible. */
  turn: string;
  /** One line of state: thinking, no legal moves, or a hint. */
  message: string | null;
}

export interface HudView {
  root: Container;
  layout(width: number, height: number): void;
  update(state: HudState): void;
}

export function createHud(handlers: { onRoll(): void; onSum(): void }): HudView {
  const root = new Container();
  const panel = new Graphics();
  const diceGraphics = new Graphics();

  const rollButton = new Container();
  const rollPlate = new Graphics();
  const rollLabel = new Text({ text: 'Бросить', style: { fill: COLORS.ivory, fontFamily: FONT, fontWeight: '700' } });
  rollLabel.anchor.set(0.5);
  rollButton.addChild(rollPlate, rollLabel);

  const sumButton = new Container();
  const sumPlate = new Graphics();
  const sumLabel = new Text({ text: '', style: { fill: COLORS.ivory, fontFamily: FONT, fontWeight: '700' } });
  sumLabel.anchor.set(0.5);
  sumButton.addChild(sumPlate, sumLabel);

  const turn = new Text({ text: '', style: { fill: COLORS.ivory, fontFamily: FONT, fontWeight: '700' } });
  turn.anchor.set(0, 0.5);
  const message = new Text({ text: '', style: { fill: COLORS.brassLight, fontFamily: FONT, fontWeight: '700' } });
  message.anchor.set(0, 0.5);

  rollButton.eventMode = 'static';
  rollButton.cursor = 'pointer';
  rollButton.on('pointertap', handlers.onRoll);
  sumButton.eventMode = 'static';
  sumButton.cursor = 'pointer';
  sumButton.on('pointertap', handlers.onSum);

  root.addChild(panel, diceGraphics, rollButton, sumButton, turn, message);

  let dieSize = 56;
  let top = 0;
  let diceOrigin = { x: 0, y: 0 };

  return {
    root,
    layout(nextWidth, height) {
      top = height - HUD_HEIGHT;
      panel.clear().rect(0, top, nextWidth, HUD_HEIGHT).fill({ color: COLORS.panel, alpha: 0.92 });

      dieSize = Math.max(40, Math.min(68, nextWidth * 0.13));
      const gap = dieSize * 0.3;
      const rowWidth = dieSize * 2 + gap;
      diceOrigin = { x: nextWidth * 0.42 - rowWidth / 2, y: top + 52 - dieSize / 2 };

      const buttonWidth = Math.max(112, Math.min(200, nextWidth * 0.28));
      const buttonHeight = 50;
      rollButton.position.set(nextWidth - buttonWidth / 2 - 12, top + 56);
      rollPlate
        .clear()
        .roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonHeight / 2)
        .fill(COLORS.cell);
      rollPlate
        .roundRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonHeight / 2)
        .stroke({ width: 2, color: COLORS.brass });
      rollLabel.style.fontSize = Math.round(buttonHeight * 0.36);

      const sumWidth = Math.min(150, nextWidth * 0.36);
      sumButton.position.set(nextWidth * 0.42, top + 108);
      sumPlate.clear().roundRect(-sumWidth / 2, -20, sumWidth, 40, 20).fill({ color: COLORS.panel, alpha: 0.9 });
      sumPlate.roundRect(-sumWidth / 2, -20, sumWidth, 40, 20).stroke({ width: 2, color: COLORS.brass });
      sumLabel.style.fontSize = 17;

      turn.position.set(14, top + 20);
      turn.style.fontSize = Math.max(15, Math.min(20, nextWidth * 0.032));
      message.position.set(14, top + 46);
      message.style.fontSize = Math.max(13, Math.min(19, nextWidth * 0.03));
    },
    update(state) {
      diceGraphics.clear();
      const pool = [...state.remaining];
      for (let index = 0; index < state.dice.length; index += 1) {
        const value = state.dice[index];
        const poolIndex = pool.indexOf(value);
        const unspent = poolIndex >= 0;
        if (unspent) pool.splice(poolIndex, 1);
        drawDie(diceGraphics, diceOrigin.x + index * dieSize * 1.3, diceOrigin.y, dieSize, value, unspent);
      }

      rollButton.alpha = state.canRoll ? 1 : 0.45;
      rollButton.eventMode = state.canRoll ? 'static' : 'none';

      sumButton.visible = state.sumLabel !== null;
      if (state.sumLabel !== null) sumLabel.text = state.sumLabel;

      turn.text = state.turn;
      message.visible = state.message !== null;
      if (state.message !== null) message.text = state.message;
    },
  };
}

function drawDie(graphics: Graphics, x: number, y: number, size: number, value: number, unspent: boolean): void {
  const radius = size * 0.18;
  graphics
    .roundRect(x, y, size, size, radius)
    .fill({ color: COLORS.ivory, alpha: unspent ? 1 : 0.42 });
  if (unspent) graphics.roundRect(x, y, size, size, radius).stroke({ width: 2, color: COLORS.brass });

  const pipColor = unspent ? COLORS.engraved : COLORS.spentPip;
  const offset = size * 0.24;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const pip = size * 0.075;
  const positions: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [[-offset, -offset], [offset, offset]],
    3: [[-offset, -offset], [0, 0], [offset, offset]],
    4: [[-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset]],
    5: [[-offset, -offset], [offset, -offset], [0, 0], [-offset, offset], [offset, offset]],
    6: [[-offset, -offset], [offset, -offset], [-offset, 0], [offset, 0], [-offset, offset], [offset, offset]],
  };
  for (const [dx, dy] of positions[value] ?? []) {
    graphics.circle(cx + dx, cy + dy, pip).fill(pipColor);
  }

  if (!unspent) {
    graphics
      .moveTo(x + size * 0.66, cy)
      .lineTo(x + size * 0.76, cy + size * 0.1)
      .lineTo(x + size * 0.9, cy - size * 0.12)
      .stroke({ width: size * 0.07, color: COLORS.brass });
  }
}
