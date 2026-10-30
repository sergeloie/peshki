import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { Game, createBot, seededRandom } from '../engine';
import type { Difficulty, Move, PawnRef } from '../engine';
import { HANDOVER_MS, decisionDelay } from '../game/pacing';
import { createBoardGeometry } from '../render/board-geometry';
import { createBoardView } from '../render/board-view';
import { createPawnViews } from '../render/pawns';
import { createHud, computeGameLayout } from '../render/hud';
import type { GameLayout } from '../render/hud';
import { sharedTextures } from '../render/table-surface';
import { PLAYERS } from '../render/palette';
import { STRINGS, format, seatLabel } from './strings';

export interface GameScreen {
  root: Container;
  layout(width: number, height: number): void;
}

export interface GameScreenOptions {
  /** Bot level chosen by progression before this game started. */
  difficulty: Difficulty;
  /** Drives the newborn pulse and the dice pulse. */
  ticker: Ticker;
  /** Fixed seed keeps screenshots reproducible. */
  seed?: number;
  /** Debug harness (art review #6): show only these board/table layers. */
  visibleLayers?: ReadonlySet<string>;
  /** Debug harness: expose world-bounds probe for the audit test. */
  debug?: boolean;
  onGameOver?(): void;
}

export function createGameScreen(options: GameScreenOptions): GameScreen {
  const gameSeed = options.seed ?? Date.now();
  const game = new Game({ random: seededRandom(gameSeed >>> 0) });
  const botRandom = seededRandom((gameSeed ^ 0x9e3779b9) >>> 0);
  const bot = createBot(game.board, options.difficulty, { random: botRandom });
  let gameLayout: GameLayout = computeGameLayout(1, 1);
  let geometry = createBoardGeometry(1, 1);
  let finished = false;

  const textures = sharedTextures();
  const boardView = createBoardView(geometry, textures);
  const pawnViews = createPawnViews(game.board, geometry, textures, boardView.pointOf);
  const hud = createHud(textures, { onRoll, onSum });
  if (options.visibleLayers !== undefined) {
    boardView.setLayerVisible(options.visibleLayers);
    pawnViews.root.visible = options.visibleLayers.has('pawns');
    hud.root.visible = options.visibleLayers.has('hud');
  }

  const boardLayer = new Container();
  boardLayer.addChild(boardView.root, pawnViews.root);

  const root = new Container();
  root.addChild(boardLayer, hud.root);
  root.eventMode = 'static';

  options.ticker.add(() => {
    pawnViews.tick(options.ticker.deltaMS);
    hud.tick(options.ticker.deltaMS);
  });

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
      setSelection(pawn, game.legalMoves().filter((move) => move.pawnIndex === pawn.pawnIndex));
      return;
    }

    const cell = cellAt(point.x, point.y);
    if (cell === null) return;
    const candidates = pending.filter((move) => move.targetCellIndex === cell);
    if (candidates.length === 0) return;
    const move =
      selected === null
        ? candidates[0]
        : (candidates.find((candidate) => candidate.pawnIndex === selected?.pawnIndex) ?? candidates[0]);
    void play(move);
  });

  /** §5/§7.3: selected pawn lifts, brass hint ring, dotted line to every target. */
  function setSelection(ref: PawnRef | null, moves: Move[]): void {
    selected = ref;
    pending = moves;
    pawnViews.setSelected(selected);
    if (selected === null) {
      boardView.highlight(
        game.isHuman(game.playerIndex) && !busy ? pendingTargets() : [],
        null,
      );
      return;
    }
    const sprite = pawnViews.sprite(selected.playerIndex, selected.pawnIndex);
    boardView.highlight(pending.map((move) => move.targetCellIndex), { x: sprite.x, y: sprite.y });
  }

  function pendingTargets(): number[] {
    return pending.map((move) => move.targetCellIndex);
  }

  function onRoll(): void {
    if (busy || game.gameOver || game.remainingDice.length > 0 || !game.isHuman(game.playerIndex)) return;

    const events = game.rollDice();
    if (events.some((event) => event.type === 'moveRejected')) return;

    // A roll that ends the turn had no legal move to play: say so before the hand-over.
    const ended = events.some((event) => event.type === 'turnEnded' || event.type === 'gameWon' || event.type === 'gameDrawn');
    if (!ended) {
      setSelection(null, game.legalMoves());
      refreshHud();
      return;
    }
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
    setSelection(null, sumMoves);
    refreshHud();
  }

  async function play(move: Move): Promise<void> {
    if (busy || game.gameOver) return;
    busy = true;
    setSelection(null, []);
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
        victim.position.set(
          from.x + (target.x - from.x) * eased,
          from.y + (target.y - from.y) * eased - Math.sin(Math.PI * t) * 40 * geometry.scale,
        );
      });
    }

    refreshCorners();
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

      const move = bot(legal, { dice: [...game.remainingDice] });
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
      if (game.gameOver) {
        busy = false;
        settle();
        return;
      }
    }
    if (!game.isHuman(game.playerIndex)) {
      await botTurn();
      return;
    }
    busy = false;
    settle();
  }

  function settle(): void {
    busy = false;
    if (game.gameOver) {
      setSelection(null, []);
      finishGame();
    } else {
      setSelection(null, game.isHuman(game.playerIndex) ? game.legalMoves() : []);
      syncHumanDisabled();
    }
    refreshHud();
    refreshCorners();
  }

  /** §5 disabled look: waiting human pawns without a legal move dim down. */
  function syncHumanDisabled(): void {
    if (!game.isHuman(game.playerIndex) || game.gameOver || pending.length === 0) {
      pawnViews.setDisabled(0, []);
      return;
    }
    const movable = new Set(pending.map((move) => move.pawnIndex));
    const disabled = game.board.movablePawns(0).filter((pawnIndex) => !movable.has(pawnIndex));
    pawnViews.setDisabled(0, disabled);
  }

  function finishGame(): void {
    if (finished) return;
    finished = true;
    pending = [];
    selected = null;
    pawnViews.setSelected(null);
    boardView.highlight([]);
    options.onGameOver?.();
  }

  /** §4 corner plate symbols hide as soon as a pawn stands on the corner. */
  function refreshCorners(): void {
    for (let playerIndex = 0; playerIndex < PLAYERS.length; playerIndex += 1) {
      const cornerCell = game.board.cornerCell(playerIndex);
      boardView.setCornerOccupied(playerIndex, game.board.occupantAt(cornerCell) !== null);
    }
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
    // boardLayer holds the square board at its own offset inside the screen
    const bx = x - boardLayer.x;
    const by = y - boardLayer.y;
    for (const cell of [...geometry.ring, ...geometry.homes.flat()]) {
      const distance = Math.hypot(cell.x - bx, cell.y - by);
      if (closest === null || distance < closest.distance) closest = { cellIndex: cell.cellIndex, distance };
    }
    if (closest === null || closest.distance > geometry.cellSize * 0.55) return null;
    return closest.cellIndex;
  }

  function refreshHud(): void {
    const sumMoves = sumMovesFor(game);
    const dice = game.rolledDice;
    hud.update({
      dice,
      remaining: game.remainingDice,
      canRoll: !busy && !game.gameOver && game.isHuman(game.playerIndex) && game.remainingDice.length === 0,
      sumLabel:
        sumMoves.length > 0 && dice.length === 2
          ? format(STRINGS.gameSumHint, { sum: dice[0] + dice[1], a: dice[0], b: dice[1] })
          : null,
      message: resultMessage(game) ?? stateMessage(),
      players: PLAYERS.map((_, playerIndex) => ({
        playerIndex,
        name: seatLabel(playerIndex),
        benchCount: game.board.benchPawns(playerIndex).length,
        active: playerIndex === game.playerIndex && !game.gameOver,
      })),
    });
  }

  function stateMessage(): string | null {
    if (noMoves) return STRINGS.gameNoMoves;
    if (thinking) return `${seatLabel(game.playerIndex)} ${STRINGS.gameBotThinking}`;
    if (game.isHuman(game.playerIndex)) {
      return game.remainingDice.length > 0 ? STRINGS.gameYourMove : STRINGS.gameYourMoveRoll;
    }
    return STRINGS.gameBotMove;
  }

  return {
    root,
    layout(width, height) {
      gameLayout = computeGameLayout(width, height);
      geometry = createBoardGeometry(gameLayout.board.size, gameLayout.board.size);
      boardLayer.position.set(gameLayout.board.x, gameLayout.board.y);
      boardView.layout(geometry);
      pawnViews.layout(geometry);
      hud.layout(width, height, gameLayout);
      root.hitArea = new Rectangle(0, 0, width, height);
      if (options.debug) {
        // measured, not asserted: frame rects and pawn boxes in screen px
        (window as unknown as Record<string, unknown>).__peshkiMeasure = () => {
          const k = geometry.scale;
          const pawnBoxes: Array<{ playerIndex: number; pawnIndex: number; x: number; y: number; w: number; h: number }> = [];
          pawnViews.root.children.forEach((child, index) => {
            const bounds = child.getLocalBounds();
            pawnBoxes.push({
              playerIndex: Math.floor(index / game.config.numberOfPawns),
              pawnIndex: index % game.config.numberOfPawns,
              x: boardLayer.x + child.x + bounds.minX * child.scale.x,
              y: boardLayer.y + child.y + bounds.minY * child.scale.y,
              w: (bounds.maxX - bounds.minX) * child.scale.x,
              h: (bounds.maxY - bounds.minY) * child.scale.y,
            });
          });
          return {
            viewport: { width, height },
            boardOuter: {
              x: gameLayout.board.x + gameLayout.board.size / 2 - 640 * k,
              y: gameLayout.board.y + gameLayout.board.size / 2 - 640 * k,
              size: 1280 * k,
            },
            frameInnerHalf: 542 * k,
            scale: k,
            pawnBoxes,
          };
        };
      }
      setSelection(null, game.isHuman(game.playerIndex) ? game.legalMoves() : []);
      refreshCorners();
      refreshHud();
    },
  };
}

function sumMovesFor(game: Game): Move[] {
  if (game.remainingDice.length !== 2 || game.rolledDice.length !== 2) return [];
  return game.legalMoves().filter((move) => move.kind === 'step' && move.consumedDice.length === 2);
}

/** One plain line until ticket #7 builds the real victory screens. */
function resultMessage(game: Game): string | null {
  if (!game.gameOver) return null;
  if (game.result === 'draw') return format(STRINGS.resultDraw, { n: game.config.maxTurns });
  return format(STRINGS.resultWinner, { n: game.winnerPlayerIndex + 1 });
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
