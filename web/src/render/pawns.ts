import { Container, Graphics } from 'pixi.js';
import type { Board } from '../engine';
import type { BoardGeometry, Point } from './board-geometry';
import { PLAYERS, drawSymbol } from './palette';

const PAWN_RADIUS = 24;

const STATE_SCALE = { BENCH: 0.62, NEWBORN: 1, FIELDER: 1, HOMER: 0.8 } as const;
const STATE_ALPHA = { BENCH: 0.75, NEWBORN: 1, FIELDER: 1, HOMER: 0.72 } as const;

export interface PawnViews {
  root: Container;
  layout(geometry: BoardGeometry): void;
  sync(): void;
  sprite(playerIndex: number, pawnIndex: number): Container;
  benchPoint(playerIndex: number, pawnIndex: number): Point;
}

export function createPawnViews(
  board: Board,
  initial: BoardGeometry,
  pointOf: (cellIndex: number) => Point | null,
): PawnViews {
  const root = new Container();
  const sprites: Container[][] = [];
  let geometry = initial;

  for (let playerIndex = 0; playerIndex < board.config.numberOfPlayers; playerIndex += 1) {
    const row: Container[] = [];
    for (let pawnIndex = 0; pawnIndex < board.config.numberOfPawns; pawnIndex += 1) {
      const sprite = new Container();
      const look = PLAYERS[playerIndex];
      const disc = new Graphics();
      disc.circle(0, 0, PAWN_RADIUS).fill(look.color);
      disc.circle(0, 0, PAWN_RADIUS).stroke({ width: 2, color: look.deep });
      drawSymbol(disc, look.symbol, 0, 0, PAWN_RADIUS * 1.5, look.deep, 0.9);
      sprite.addChild(disc);
      root.addChild(sprite);
      row.push(sprite);
    }
    sprites.push(row);
  }

  function sync(): void {
    for (let playerIndex = 0; playerIndex < sprites.length; playerIndex += 1) {
      for (let pawnIndex = 0; pawnIndex < sprites[playerIndex].length; pawnIndex += 1) {
        const sprite = sprites[playerIndex][pawnIndex];
        const state = board.pawnState(playerIndex, pawnIndex);
        const point = pointFor(playerIndex, pawnIndex);
        sprite.position.set(point.x, point.y);
        sprite.scale.set(geometry.scale * STATE_SCALE[state]);
        sprite.alpha = STATE_ALPHA[state];
      }
    }
  }

  function pointFor(playerIndex: number, pawnIndex: number): Point {
    if (board.isBench(playerIndex, pawnIndex)) return benchPoint(playerIndex, pawnIndex);
    const point = pointOf(board.position.cellOf(playerIndex, pawnIndex));
    return point ?? benchPoint(playerIndex, pawnIndex);
  }

  function benchPoint(playerIndex: number, pawnIndex: number): Point {
    return geometry.benches[playerIndex][pawnIndex];
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
  };
}
