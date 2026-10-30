import { Container, Graphics, Sprite } from 'pixi.js';
import type { PawnRef } from '../engine';
import type { Board } from '../engine';
import type { BoardGeometry, Point } from './board-geometry';
import type { GameTextures } from './textures';
import { createPawnTextures } from './pawn-art';

const DESIGN_HEIGHT = 112;
/** Base-centre anchor inside the pawn texture (§5 silhouette). */
const ANCHOR_Y = 97 / DESIGN_HEIGHT;
const BRASS_HINT = 0xf3d77b;

/** §5 size and alpha hierarchy per pawn state. BENCH sits in the Ø44 slot (art-direction §12). */
const STATE_SCALE = { BENCH: 0.5, NEWBORN: 1, FIELDER: 1, HOMER: 0.8 } as const;
const STATE_ALPHA = { BENCH: 0.75, NEWBORN: 1, FIELDER: 1, HOMER: 0.72 } as const;
const LIFT_SELECTED = 12; // §5 selected lift, design px
const PULSE_PERIOD_MS = 1600; // §6 dice pulse rhythm reused for the newborn ring

export interface PawnViews {
  root: Container;
  layout(geometry: BoardGeometry): void;
  sync(): void;
  sprite(playerIndex: number, pawnIndex: number): Container;
  benchPoint(playerIndex: number, pawnIndex: number): Point;
  setDisabled(playerIndex: number, disabledPawnIndices: readonly number[]): void;
  setSelected(ref: PawnRef | null): void;
  /** Newborn ring pulse; drive from a ticker with delta ms. */
  tick(elapsedMs: number): void;
}

export function createPawnViews(
  board: Board,
  initial: BoardGeometry,
  textures: GameTextures,
  pointOf: (cellIndex: number) => Point | null,
): PawnViews {
  const pawnTextures = createPawnTextures();
  const root = new Container();
  const sprites: Container[][] = [];
  const bodies: Sprite[][] = [];
  const shadows: Sprite[][] = [];
  const rings: Graphics[][] = [];
  let geometry = initial;
  const disabled: number[][] = [[], [], [], []];
  let selected: PawnRef | null = null;
  let pulsePhase = 0;

  for (let playerIndex = 0; playerIndex < board.config.numberOfPlayers; playerIndex += 1) {
    const row: Container[] = [];
    const bodyRow: Sprite[] = [];
    const shadowRow: Sprite[] = [];
    const ringRow: Graphics[] = [];
    for (let pawnIndex = 0; pawnIndex < board.config.numberOfPawns; pawnIndex += 1) {
      const sprite = new Container();

      const shadow = new Sprite({ texture: textures.shadow });
      shadow.anchor.set(0.5, 0.5);

      const ring = new Graphics();
      ring.visible = false;

      const body = new Sprite({ texture: pawnTextures.normal[playerIndex] });
      body.anchor.set(0.5, ANCHOR_Y);

      sprite.addChild(shadow, ring, body);
      root.addChild(sprite);
      row.push(sprite);
      bodyRow.push(body);
      shadowRow.push(shadow);
      ringRow.push(ring);
    }
    sprites.push(row);
    bodies.push(bodyRow);
    shadows.push(shadowRow);
    rings.push(ringRow);
  }

  function sync(): void {
    for (let playerIndex = 0; playerIndex < sprites.length; playerIndex += 1) {
      for (let pawnIndex = 0; pawnIndex < sprites[playerIndex].length; pawnIndex += 1) {
        const sprite = sprites[playerIndex][pawnIndex];
        const state = board.pawnState(playerIndex, pawnIndex);
        const point = pointFor(playerIndex, pawnIndex);
        const isSelected =
          selected !== null && selected.playerIndex === playerIndex && selected.pawnIndex === pawnIndex;
        const isDisabled = disabled[playerIndex].includes(pawnIndex) && !isSelected && state !== 'BENCH';

        sprite.position.set(point.x, point.y - (isSelected ? LIFT_SELECTED * geometry.scale : 0));
        sprite.scale.set(geometry.scale * STATE_SCALE[state]);
        sprite.alpha = isDisabled ? 0.55 : STATE_ALPHA[state];
        bodies[playerIndex][pawnIndex].texture = isDisabled
          ? pawnTextures.washed[playerIndex]
          : pawnTextures.normal[playerIndex];

        // §3 contact shadow: offset (3,5), blur 12, alpha 0.35; bigger under lifted pawns
        const shadow = shadows[playerIndex][pawnIndex];
        if (state === 'BENCH' || state === 'HOMER') {
          shadow.visible = false;
        } else {
          shadow.visible = true;
          const size = (isSelected ? 82 : 66) * geometry.scale;
          shadow.width = size;
          shadow.height = size * 0.55;
          shadow.x = point.x + 3 * geometry.scale;
          shadow.y = point.y + 5 * geometry.scale;
          shadow.alpha = isSelected ? 0.3 : 0.42;
        }
      }
    }
    redrawRings();
  }

  /** §5 brass ring under the selected base; pulsing ring on newborns sitting at the corner. */
  function redrawRings(): void {
    for (let playerIndex = 0; playerIndex < sprites.length; playerIndex += 1) {
      for (let pawnIndex = 0; pawnIndex < sprites[playerIndex].length; pawnIndex += 1) {
        const ring = rings[playerIndex][pawnIndex];
        const state = board.pawnState(playerIndex, pawnIndex);
        const isSelected =
          selected !== null && selected.playerIndex === playerIndex && selected.pawnIndex === pawnIndex;
        const isNewborn = state === 'NEWBORN';
        if (!isSelected && !isNewborn) {
          ring.clear();
          ring.visible = false;
          continue;
        }
        ring.visible = true;
        const pulsating = isNewborn && !isSelected;
        const alpha = pulsating ? 0.55 + 0.35 * Math.sin((pulsePhase / PULSE_PERIOD_MS) * Math.PI * 2) : 0.95;
        ring.clear();
        ring.circle(0, 0, 46 * geometry.scale).stroke({
          width: (isSelected ? 3.5 : 3) * geometry.scale,
          color: BRASS_HINT,
          alpha,
        });
      }
    }
  }

  function pointFor(playerIndex: number, pawnIndex: number): Point {
    if (board.isBench(playerIndex, pawnIndex)) return benchPoint(playerIndex, pawnIndex);
    const point = pointOf(board.position.cellOf(playerIndex, pawnIndex));
    return point ?? benchPoint(playerIndex, pawnIndex);
  }

  function benchPoint(playerIndex: number, pawnIndex: number): Point {
    const slot = geometry.benches[playerIndex][pawnIndex];
    return { x: slot.x, y: slot.y };
  }

  sync();

  return {
    root,
    layout(next) {
      geometry = next;
      sync();
    },
    sync,
    sprite(playerIndex, pawnIndex) {
      return sprites[playerIndex][pawnIndex];
    },
    benchPoint,
    setDisabled(playerIndex, disabledPawnIndices) {
      disabled[playerIndex] = [...disabledPawnIndices];
      sync();
    },
    setSelected(ref) {
      selected = ref;
      sync();
    },
    tick(elapsedMs) {
      pulsePhase += elapsedMs;
      redrawRings();
    },
  };
}
