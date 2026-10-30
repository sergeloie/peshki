import { Container, Graphics, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
import { Game, createBot, seededRandom } from '../engine';
import type { Difficulty, Move, PawnRef } from '../engine';
import { HANDOVER_MS, decisionDelay } from '../game/pacing';
import { createBoardGeometry } from '../render/board-geometry';
import { createBoardView } from '../render/board-view';
import { createPawnViews } from '../render/pawns';
import { HUD_HEIGHT, createHud } from '../render/hud';
import { COLORS } from '../render/palette';

export interface GameScreen {
  root: Container;
  layout(width: number, height: number): void;
}

export interface GameScreenOptions {
  /** Bot level chosen by progression before this game started. */
  difficulty: Difficulty;
  onGameOver?(): void;
}

const BOT_NAMES = ['Оскар', 'Нина', 'Гектор'];

export function createGameScreen(options: GameScreenOptions): GameScreen {
  const game = new Game({ random: seededRandom(Date.now() >>> 0) });
  const botRandom = seededRandom((Date.now() ^ 0x9e3779b9) >>> 0);
  const bot = createBot(game.board, options.difficulty, { random: botRandom });
  let geometry = createBoardGeometry(1, 1);
  let finished = false;

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
  let thinking = false;
  let noMoves = false;

  root.on('pointertap', (event: FederatedPointerEvent) => {
    if (busy || game.gameOver) return;
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
    if (busy || game.gameOver || game.remainingDice.length > 0 || !game.isHuman(game.playerIndex)) return;

    const events = game.rollDice();
    if (events.some((event) => event.type === 'moveRejected')) return;

    selected = null;
    selection.clear();
    const ended = events.some((event) => event.type === 'turnEnded' || event.type === 'gameWon' || event.type === 'gameDrawn');
    if (!ended) {
      pending = game.legalMoves();
      boardView.highlight(pending.map((move) => move.targetCellIndex));
      refreshHud();
      return;
    }
    // A roll that ends the turn had no legal move to play: say so before the hand-over.
    void handOverFromHuman(events.some((event) => event.type === 'turnEnded'));
  }

  function onSum(): void {
    if (busy || game.gameOver) return;
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
    if (busy || game.gameOver) return;
    busy = true;
    selected = null;
    pending = [];
    selection.clear();
    boardView.highlight([]);
    refreshHud();

    await performMove(move);
    if (!game.gameOver && !game.isHuman(game.playerIndex)) {
      await botTurn();
      return;
    }
    busy = false;
    settle();
  }

  /** Applies one move and animates it on its own; the caller owns `busy`. */
  async function performMove(move: Move): Promise<void> {
    const path =
      move.kind === 'step'
        ? game.board.stepPath(move.playerIndex, move.pawnIndex, move.steps)
        : move.steps > 0
          ? game.board.pathFromCorner(move.playerIndex, move.steps)
          : null;
    if (move.kind === 'step' && path === null) return;

    const events = game.apply(move);
    if (events.some((event) => event.type === 'moveRejected')) return;
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
  }

  /**
   * Drives every non-human seat: one readable beat per decision, one animation per
   * move. `busy` stays true for the whole sequence, so a tap cannot leak into the
   * next seat or a stale dice list.
   */
  async function botTurn(): Promise<void> {
    busy = true;
    let changedSeat = false;
    while (!game.gameOver && !game.isHuman(game.playerIndex)) {
      const seat = game.playerIndex;

      if (game.remainingDice.length === 0) {
        thinking = true;
        refreshHud();
        await sleep(decisionDelay(botRandom));
        thinking = false;
        if (game.gameOver || game.playerIndex !== seat) break;
        const rolled = game.rollDice();
        refreshHud();
        if (rolled.some((event) => event.type === 'turnEnded')) {
          noMoves = true;
          refreshHud();
          await sleep(HANDOVER_MS);
          noMoves = false;
          refreshHud();
        }
        if (game.playerIndex !== seat) changedSeat = true;
        continue;
      }

      const legal = game.legalMoves();
      if (legal.length === 0) {
        game.pass();
        continue;
      }

      thinking = true;
      refreshHud();
      await sleep(decisionDelay(botRandom));
      thinking = false;
      if (game.gameOver || game.playerIndex !== seat) break;

      const move = bot(legal);
      if (move === null) break;
      await performMove(move);
      refreshHud();
      if (game.playerIndex !== seat) changedSeat = true;
    }

    // Keep the hand-over on screen for a beat, still locked.
    if (changedSeat && !game.gameOver && game.isHuman(game.playerIndex)) await sleep(HANDOVER_MS);
    busy = false;
    settle();
  }

  async function handOverFromHuman(turnEnded: boolean): Promise<void> {
    busy = true;
    if (turnEnded) {
      noMoves = true;
      refreshHud();
      await sleep(HANDOVER_MS);
      noMoves = false;
    }
    if (game.gameOver) {
      busy = false;
      settle();
      return;
    }
    if (!game.isHuman(game.playerIndex)) {
      await botTurn();
      return;
    }
    busy = false;
    settle();
  }

  function settle(): void {
    if (game.gameOver) {
      pending = [];
      boardView.highlight([]);
      finishGame();
    } else {
      pending = game.legalMoves();
      boardView.highlight(pending.map((move) => move.targetCellIndex));
    }
    refreshHud();
  }

  function finishGame(): void {
    if (finished) return;
    finished = true;
    pending = [];
    selected = null;
    selection.clear();
    boardView.highlight([]);
    options.onGameOver?.();
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
      canRoll: !busy && !game.gameOver && game.isHuman(game.playerIndex) && game.remainingDice.length === 0,
      sumLabel:
        sumMoves.length > 0 && game.rolledDice.length === 2
          ? `${game.rolledDice[0] + game.rolledDice[1]} = ${game.rolledDice[0]} + ${game.rolledDice[1]}`
          : null,
      turn: seatLabel(game.playerIndex),
      message: resultMessage(game) ?? stateMessage(),
    });
  }

  function stateMessage(): string | null {
    if (noMoves) return 'Нет доступных ходов';
    if (thinking) return `${seatLabel(game.playerIndex)} думает…`;
    if (game.isHuman(game.playerIndex)) return game.remainingDice.length > 0 ? 'Ваш ход' : 'Ваш ход — бросайте';
    return `${seatLabel(game.playerIndex)}: ход`;
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

function seatLabel(playerIndex: number): string {
  if (playerIndex === 0) return 'Вы';
  return BOT_NAMES[playerIndex - 1] ?? `Игрок ${playerIndex + 1}`;
}

function sumMovesFor(game: Game): Move[] {
  if (game.remainingDice.length !== 2 || game.rolledDice.length !== 2) return [];
  return game.legalMoves().filter((move) => move.kind === 'step' && move.consumedDice.length === 2);
}

/** One plain line until ticket #7 builds the real victory screens. */
function resultMessage(game: Game): string | null {
  if (!game.gameOver) return null;
  if (game.result === 'draw') return `Ничья: лимит ${game.config.maxTurns} ходов`;
  return `Победил игрок ${game.winnerPlayerIndex + 1}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
