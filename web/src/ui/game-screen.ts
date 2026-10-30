import { Container, Graphics, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import { Game, seededRandom } from '../engine';
import type { Move, PawnRef } from '../engine';
import { createBoardGeometry } from '../render/board-geometry';
import { createBoardView } from '../render/board-view';
import { createPawnViews } from '../render/pawns';
import { HUD_HEIGHT, createHud } from '../render/hud';
import { COLORS } from '../render/palette';
import { nextRollerAfterDiceSpent } from '../game/flow';

export interface GameScreen {
  root: Container;
  layout(width: number, height: number): void;
}

export function createGameScreen(): GameScreen {
  const game = new Game({ random: seededRandom(Date.now() >>> 0) });
  let geometry = createBoardGeometry(1, 1);

  const boardView = createBoardView(geometry);
  const pawnViews = createPawnViews(game.board, geometry, boardView.pointOf);
  const hud = createHud({ onRoll, onSum });
  const selection = new Graphics();
  const root = new Container();
  root.addChild(boardView.root, selection, pawnViews.root, hud.root);
  root.eventMode = 'static';

  let selected: PawnRef | null = null;
  let pending: Move[] = [];
  let busy = false;

  root.on('pointertap', (event: FederatedPointerEvent) => {
    if (busy) return;
    const point = event.getLocalPosition(root);

    const pawn = pawnAt(point.x, point.y);
    if (pawn !== null) {
      selected = pawn;
      pending = game.legalMoves().filter((move) => move.pawnIndex === pawn.pawnIndex);
      boardView.highlight(pending.map((move) => move.targetCellIndex));
      drawSelection();
      return;
    }

    const cell = cellAt(point.x, point.y);
    if (cell === null) return;
    const candidates = pending.filter((move) => move.targetCellIndex === cell);
    if (candidates.length === 0) return;
    const move =
      selected === null ? candidates[0] : candidates.find((candidate) => candidate.pawnIndex === selected?.pawnIndex) ?? candidates[0];
    void play(move);
  });

  function onRoll(): void {
    if (busy || game.remainingDice.length > 0) return;
    const roller = nextRollerAfterDiceSpent(game.playerIndex);
    if (roller !== game.playerIndex) return;

    const events = game.rollDice();
    if (events.some((event) => event.type === 'moveRejected')) return;
    if (game.legalMoves().length === 0) game.pass();

    selected = null;
    selection.clear();
    pending = game.legalMoves();
    boardView.highlight(pending.map((move) => move.targetCellIndex));
    refreshHud();
  }

  function onSum(): void {
    if (busy) return;
    const sumMoves = sumMovesFor(game);
    if (sumMoves.length === 0) return;
    if (sumMoves.length === 1) {
      void play(sumMoves[0]);
      return;
    }
    selected = null;
    selection.clear();
    pending = sumMoves;
    boardView.highlight(pending.map((move) => move.targetCellIndex));
    refreshHud();
  }

  async function play(move: Move): Promise<void> {
    if (busy) return;
    const path =
      move.kind === 'step'
        ? game.board.stepPath(move.playerIndex, move.pawnIndex, move.steps)
        : move.steps > 0
          ? game.board.pathFromCorner(move.playerIndex, move.steps)
          : null;
    if (move.kind === 'step' && path === null) return;

    const events = game.apply(move);
    if (events.some((event) => event.type === 'moveRejected')) {
      refreshHud();
      return;
    }

    busy = true;
    selected = null;
    pending = [];
    selection.clear();
    boardView.highlight([]);
    refreshHud();

    const sprite = pawnViews.sprite(move.playerIndex, move.pawnIndex);
    if (move.kind === 'place') {
      const corner = boardView.pointOf(move.targetCellIndex);
      if (corner !== null) {
        const from = { x: sprite.x, y: sprite.y };
        const fromScale = 0.62 * geometry.scale;
        const toScale = geometry.scale;
        await animate(220, (t) => {
          const eased = easeOut(t);
          sprite.position.set(from.x + (corner.x - from.x) * eased, from.y + (corner.y - from.y) * eased);
          sprite.scale.set(fromScale + (toScale - fromScale) * eased);
          sprite.alpha = 0.75 + 0.25 * eased;
        });
      }
    }

    for (const cellIndex of path ?? []) {
      const target = boardView.pointOf(cellIndex);
      if (target === null) continue;
      const from = { x: sprite.x, y: sprite.y };
      await animate(160, (t) => {
        const eased = easeInOut(t);
        sprite.position.set(
          from.x + (target.x - from.x) * eased,
          from.y + (target.y - from.y) * eased - Math.sin(Math.PI * t) * 16 * geometry.scale,
        );
      });
    }

    for (const event of events) {
      if (event.type !== 'pawnKilled') continue;
      const victim = pawnViews.sprite(event.victimPlayerIndex, event.victimPawnIndex);
      const target = pawnViews.benchPoint(event.victimPlayerIndex, event.victimPawnIndex);
      const from = { x: victim.x, y: victim.y };
      await animate(300, (t) => {
        const eased = easeOut(t);
        victim.position.set(from.x + (target.x - from.x) * eased, from.y + (target.y - from.y) * eased - Math.sin(Math.PI * t) * 40 * geometry.scale);
      });
    }

    pawnViews.sync();
    if (game.remainingDice.length > 0) {
      if (game.legalMoves().length === 0) game.pass();
      else pending = game.legalMoves();
    }
    busy = false;
    boardView.highlight(pending.map((candidate) => candidate.targetCellIndex));
    refreshHud();
  }

  function pawnAt(x: number, y: number): PawnRef | null {
    for (let pawnIndex = 0; pawnIndex < game.config.numberOfPawns; pawnIndex += 1) {
      const sprite = pawnViews.sprite(game.playerIndex, pawnIndex);
      if (Math.hypot(sprite.x - x, sprite.y - y) <= 34 * geometry.scale) {
        return { playerIndex: game.playerIndex, pawnIndex };
      }
    }
    return null;
  }

  function cellAt(x: number, y: number): number | null {
    let closest: { cellIndex: number; distance: number } | null = null;
    for (const cell of [...geometry.ring, ...geometry.homes.flat()]) {
      const distance = Math.hypot(cell.x - x, cell.y - y);
      if (closest === null || distance < closest.distance) closest = { cellIndex: cell.cellIndex, distance };
    }
    if (closest === null || closest.distance > geometry.cellSize * 0.55) return null;
    return closest.cellIndex;
  }

  function drawSelection(): void {
    selection.clear();
    if (selected === null) return;
    const sprite = pawnViews.sprite(selected.playerIndex, selected.pawnIndex);
    selection.circle(sprite.x, sprite.y, 32 * geometry.scale).stroke({ width: 3, color: COLORS.brassLight });
  }

  function refreshHud(): void {
    const sumMoves = sumMovesFor(game);
    hud.update({
      dice: game.rolledDice,
      remaining: game.remainingDice,
      canRoll: !busy && game.remainingDice.length === 0,
      sumLabel:
        sumMoves.length > 0 && game.rolledDice.length === 2
          ? `${game.rolledDice[0] + game.rolledDice[1]} = ${game.rolledDice[0]} + ${game.rolledDice[1]}`
          : null,
    });
  }

  return {
    root,
    layout(width, height) {
      geometry = createBoardGeometry(width, Math.max(1, height - HUD_HEIGHT));
      boardView.layout(geometry);
      pawnViews.layout(geometry);
      hud.layout(width, height);
      root.hitArea = new Rectangle(0, 0, width, height);
      boardView.highlight(pending.map((move) => move.targetCellIndex));
      drawSelection();
      refreshHud();
    },
  };
}

function sumMovesFor(game: Game): Move[] {
  if (game.remainingDice.length !== 2 || game.rolledDice.length !== 2) return [];
  return game.legalMoves().filter((move) => move.kind === 'step' && move.consumedDice.length === 2);
}

function animate(duration: number, onUpdate: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      onUpdate(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}
