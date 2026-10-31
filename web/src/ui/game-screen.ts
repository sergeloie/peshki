import { Container, Rectangle } from 'pixi.js';
import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { Game, createBot, seededRandom } from '../engine';
import type { Difficulty, Move, PawnRef } from '../engine';
import { fromSave } from '../engine/save';
import type { SavedGame } from '../engine/save';
import { HANDOVER_MS, decisionDelay } from '../game/pacing';
import type { HintId } from '../game/progress';
import { createBoardGeometry } from '../render/board-geometry';
import { createBoardView } from '../render/board-view';
import { createPawnViews } from '../render/pawns';
import { createHud, computeGameLayout } from '../render/hud';
import type { GameLayout } from '../render/hud';
import { createEffectsLayer } from '../render/effects';
import { audio } from '../render/audio';
import { sharedTextures } from '../render/table-surface';
import { PLAYERS } from '../render/palette';
import type { Point } from '../render/board-geometry';
import { format, t } from '../i18n';
import { seatLabel } from './players';
import { createTutorialBanner } from './tutorial';
import { HINT_TEXT_KEYS } from './hints';
import { attachKeyGroup, detachKeyGroup } from './keys';
import type { KeyGroup } from './keys';
import type { Button } from './widgets';

export type GameOutcomeKind = 'win' | 'lose' | 'draw';

export interface GameOutcome {
  kind: GameOutcomeKind;
  /** Winning seat; null on a draw. */
  winnerSeat: number | null;
  turns: number;
}

export interface GameScreen {
  root: Container;
  layout(width: number, height: number): void;
  /** §7: while any dialog is open the live HUD row hides (dice, roll, pause, message). */
  setHudSuppressed(value: boolean): void;
  /** Stops the ticker work and releases the tree; used when leaving the game. */
  dispose(): void;
}

export interface GameScreenOptions {
  /** Bot level chosen by progression before this game started. */
  difficulty: Difficulty;
  /** Drives the newborn pulse and the dice pulse. */
  ticker: Ticker;
  /** Fixed seed keeps screenshots reproducible. */
  seed?: number;
  /** Restored session from the autosave envelope; absent starts a fresh game. */
  saved?: SavedGame;
  /** Fires once per completed turn, after the seat and dice ledger have settled. */
  onTurnEnd?(game: Game): void;
  /** Debug harness (art review #6): show only these board/table layers. */
  visibleLayers?: ReadonlySet<string>;
  /** Debug harness: expose world-bounds probe for the audit test. */
  debug?: boolean;
  /** Debug harness (#7 shots): stage a finished result over a live board. */
  resultOverride?: GameOutcomeKind;
  /** HUD pause button lands here; main owns the pause dialog. */
  onPauseRequest?: () => void;
  /** First-game hint ids still to teach, persisted through the progress blob. */
  hints?: readonly HintId[];
  onHintDismissed?(id: HintId): void;
  onGameOver?(outcome: GameOutcome): void;
  /** Debug harness (#8 recordings): stage one effect cycle of the real pipeline. */
  fxStage?: 'kill' | null;
}

export function createGameScreen(options: GameScreenOptions): GameScreen {
  const gameSeed = options.seed ?? Date.now();
  const game = options.saved === undefined
    ? new Game({ random: seededRandom(gameSeed >>> 0) })
    : fromSave(options.saved);
  // A restored session is already saved; only a completed turn earns a rewrite.
  let lastTurn = game.turnNumber;
  const botRandom = seededRandom((gameSeed ^ 0x9e3779b9) >>> 0);
  const bot = createBot(game.board, options.difficulty, { random: botRandom });
  let gameLayout: GameLayout = computeGameLayout(1, 1);
  let geometry = createBoardGeometry(1, 1);
  let finished = false;

  const textures = sharedTextures();
  const boardView = createBoardView(geometry, textures);
  const pawnViews = createPawnViews(game.board, geometry, textures, boardView.pointOf);
  const effects = createEffectsLayer(textures);
  const hud = createHud(textures, { onRoll, onSum, onPause: options.onPauseRequest });
  if (options.visibleLayers !== undefined) {
    boardView.setLayerVisible(options.visibleLayers);
    pawnViews.root.visible = options.visibleLayers.has('pawns');
    hud.root.visible = options.visibleLayers.has('hud');
  }

  // first-game tutorial: one concept line, dismissed before the next
  const tutorial = createTutorialBanner(() => dismissHint());
  let hintQueue: readonly HintId[] = options.hints ?? [];

  function dismissHint(): void {
    const id = hintQueue[0];
    hintQueue = hintQueue.slice(1);
    if (id !== undefined) options.onHintDismissed?.(id);
    advanceHint();
  }

  function advanceHint(): void {
    const next = hintQueue[0];
    if (next === undefined || finished || game.gameOver) {
      tutorial.hide();
      return;
    }
    tutorial.show(t(HINT_TEXT_KEYS[next]));
  }

  const boardLayer = new Container();
  boardLayer.label = 'board-layer';
  boardLayer.addChild(boardView.root, pawnViews.root);

  const root = new Container();
  root.label = 'game-screen';
  root.addChild(boardLayer, effects.root, hud.root, tutorial.root);
  root.eventMode = 'static';

  const tick = (): void => {
    const elapsed = options.ticker.deltaMS;
    pawnViews.tick(elapsed);
    hud.tick(elapsed);
    effects.tick(elapsed);
    // the §8 table shake offsets the board around its layout base
    const offset = effects.shakeOffset();
    boardLayer.position.set(boardBase.x + offset.x, boardBase.y + offset.y);
  };
  options.ticker.add(tick);

  let selected: PawnRef | null = null;
  let pending: Move[] = [];
  let busy = false;
  let thinking = false;
  let noMoves = false;
  let boardBase = { x: 0, y: 0 };

  root.on('pointertap', (event: FederatedPointerEvent) => {
    if (busy || game.gameOver) return;
    const point = event.getLocalPosition(root);

    const pawn = pawnAt(point.x, point.y);
    if (pawn !== null) {
      const pawnMoves = game.legalMoves().filter((move) => move.pawnIndex === pawn.pawnIndex);
      if (pawnMoves.length === 0) {
        // §8 refused move: ±3 px shake, clearly different from a legal selection
        void refuse(pawnViews.sprite(pawn.playerIndex, pawn.pawnIndex));
        return;
      }
      setSelection(pawn, pawnMoves);
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
    } else {
      const sprite = pawnViews.sprite(selected.playerIndex, selected.pawnIndex);
      boardView.highlight(pending.map((move) => move.targetCellIndex), { x: sprite.x, y: sprite.y });
    }
    rebuildFocus();
  }

  function pendingTargets(): number[] {
    return pending.map((move) => move.targetCellIndex);
  }

  /* ---- TV / keyboard path (#8): arrows walk roll + legal targets, OK plays ---- */

  interface FocusPair {
    key: string;
    button: Button;
    apply: (value: boolean) => void;
  }

  let focusPairs: FocusPair[] = [];
  let focusKey: string | null = null;

  function makeFocusPair(key: string, apply: (value: boolean) => void, activate: () => void): FocusPair {
    const pair: FocusPair = {
      key,
      apply,
      button: {
        root: root, // keys.ts never dereferences it; the screen is the group root
        setLabel() {},
        setFont() {},
        setSize() {},
        setFocused(value) {
          if (value) focusKey = key;
          else if (focusKey === key) focusKey = null;
          apply(value);
        },
        isFocused: () => focusKey === key,
        activate,
      },
    };
    return pair;
  }

  /** Rebuilds the focusable list from the live state; keeps focus when an item survives. */
  function rebuildFocus(): void {
    const pairs: FocusPair[] = [];
    if (!finished && !game.gameOver && game.isHuman(game.playerIndex)) {
      if (!busy && game.remainingDice.length === 0) {
        pairs.push(makeFocusPair('roll', (v) => hud.setRollFocused(v), () => onRoll()));
      }
      const seen = new Set<number>();
      for (const move of pending) {
        if (seen.has(move.targetCellIndex)) continue;
        seen.add(move.targetCellIndex);
        const cell = move.targetCellIndex;
        pairs.push(
          makeFocusPair(
            `cell:${cell}`,
            (v) => boardView.focusCell(v ? cell : null),
            () => {
              const candidates = pending.filter((candidate) => candidate.targetCellIndex === cell);
              const chosen =
                selected === null
                  ? candidates[0]
                  : (candidates.find((candidate) => candidate.pawnIndex === selected?.pawnIndex) ?? candidates[0]);
              if (chosen !== undefined) void play(chosen);
            },
          ),
        );
      }
    }
    const stillThere = focusKey !== null && pairs.some((pair) => pair.key === focusKey);
    if (!stillThere) {
      const lost = focusPairs.find((pair) => pair.key === focusKey);
      lost?.apply(false);
      focusKey = null;
    }
    focusPairs = pairs;
  }

  const gameGroup: KeyGroup = { root, focusable: () => focusPairs.map((pair) => pair.button) };
  attachKeyGroup(gameGroup);

  function onRoll(): void {
    if (busy || game.gameOver || game.remainingDice.length > 0 || !game.isHuman(game.playerIndex)) return;

    const events = game.rollDice();
    if (events.some((event) => event.type === 'moveRejected')) return;

    // §8: the dice plate choreography runs from the real diceRolled event values
    const rolled = events.find((event) => event.type === 'diceRolled');
    if (rolled !== undefined && rolled.type === 'diceRolled') {
      hud.toss(rolled.values);
      audio.play('dice');
    }

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
        // §8 placement: brass greeting ring on the corner as the pawn sets down
        effects.ringFlash(corner.x, corner.y, geometry.scale);
        audio.play('place');
      }
    }

    for (const cellIndex of path ?? []) {
      const target = boardView.pointOf(cellIndex);
      if (target === null) continue;
      // §10: one hollow knock per cell, not per animation
      audio.play('step');
      const from = { x: sprite.x, y: sprite.y };
      await animate(170, (t) => {
        const eased = easeInOut(t);
        sprite.position.set(
          from.x + (target.x - from.x) * eased,
          from.y + (target.y - from.y) * eased - Math.sin(Math.PI * t) * 20 * geometry.scale,
        );
      });
      landSquash(sprite);
    }

    for (const event of events) {
      if (event.type !== 'pawnKilled') continue;
      const victim = pawnViews.sprite(event.victimPlayerIndex, event.victimPawnIndex);
      const target = pawnViews.benchPoint(event.victimPlayerIndex, event.victimPawnIndex);
      // §5 kill flash lives on the contact cell while the arc carries the victim away
      effects.ringFlash(victim.x, victim.y, geometry.scale);
      audio.play('kill');
      await performKill(victim, target);
    }
    // §8 home entry: warm porcelain flash on the final cell
    if (events.some((event) => event.type === 'enteredHome')) {
      const lastCell =
        move.kind === 'place' ? move.targetCellIndex : path === null ? null : path[path.length - 1];
      const cell = lastCell === null ? null : boardView.pointOf(lastCell);
      if (cell !== null) {
        effects.glowFlash(cell.x, cell.y, geometry.cellSize * 2.6);
        audio.play('home');
      }
    }

    refreshCorners();
    pawnViews.sync();
  }

  /** §5/§8 kill: hop + 360° spin, then the bench arc with a high apex, shake and a brass/ivory burst. */
  async function performKill(victim: Container, target: Point): Promise<void> {
    const k = geometry.scale;
    const from = { x: victim.x, y: victim.y };

    if (!effects.claimExpensive()) {
      // !benefit of the doubt stays: the cap §8 speaks about is normative; a thin arc limps home
      await animate(300, (t) => {
        const eased = easeOut(t);
        victim.position.set(
          from.x + (target.x - from.x) * eased,
          from.y + (target.y - from.y) * eased - Math.sin(Math.PI * t) * 40 * k,
        );
      });
      return;
    }
    try {
      await animate(120, (t) => {
        const eased = easeOut(t);
        victim.position.set(from.x, from.y - Math.sin(Math.PI * t) * 24 * k);
        victim.rotation = eased * Math.PI * 2;
      });
      victim.rotation = 0;
      // the burst sells the contact; the bench arc carries the story
      effects.burst(from.x, from.y + 6 * k, 0xf2ead8, 16);
      effects.shake(3 * k);
      await animate(360, (t) => {
        const eased = easeOut(t);
        victim.position.set(
          from.x + (target.x - from.x) * eased,
          from.y + (target.y - from.y) * eased - Math.sin(Math.PI * t) * 180 * k,
        );
        victim.rotation = Math.sin(Math.PI * t) * 0.6 * k;
      });
      victim.rotation = 0;
    } finally {
      effects.releaseExpensive();
    }
  }

  /** §8 landing: 88 % scaleY compress easing back within ~70 ms; scale keeps its sync baseline. */
  function landSquash(sprite: Container): void {
    const baseY = sprite.scale.y;
    const baseX = sprite.scale.x;
    void animate(70, (t) => {
      const eased = easeOut(t);
      const factor = 0.88 + 0.12 * eased;
      sprite.scale.set(baseX, baseY * factor);
    });
  }

  /** §8 refused move: pawn shakes ±3 px and dulls, distinct from the happy selection. */
  async function refuse(sprite: Container): Promise<void> {
    audio.play('deny');
    const home = { x: sprite.x, y: sprite.y };
    await animate(240, (t) => {
      const decay = (1 - t) ** 2;
      sprite.position.set(home.x + Math.sin(t * 40) * 3 * geometry.scale * decay, home.y);
    });
    sprite.position.set(home.x, home.y);
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
      if (game.turnNumber !== lastTurn) {
        lastTurn = game.turnNumber;
        options.onTurnEnd?.(game);
      }
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

  function finishGame(cascade = true): void {
    if (finished) return;
    finished = true;
    pending = [];
    selected = null;
    pawnViews.setSelected(null);
    boardView.highlight([]);
    tutorial.hide();
    const outcome: GameOutcome = {
      kind: game.result === 'draw' ? 'draw' : game.winnerPlayerIndex === 0 ? 'win' : 'lose',
      winnerSeat: game.result === 'draw' ? null : game.winnerPlayerIndex,
      turns: game.turnNumber,
    };
    // §8: victory rolls a 600 ms home-highlight series + a beat before the modal
    if (outcome.kind === 'win' && cascade) {
      void winCascade(outcome).then(() => options.onGameOver?.(outcome));
      return;
    }
    if (outcome.kind === 'lose') audio.play('lose');
    options.onGameOver?.(outcome);
  }

  /** §8 winning serenade: each homed pawn lights up in turn, the last lands with a flash. */
  async function winCascade(outcome: GameOutcome): Promise<void> {
    if (!effects.claimExpensive()) return;
    audio.play('win');
    try {
      const winner = outcome.winnerSeat ?? 0;
      const spots: Point[] = [];
      for (let pawnIndex = 0; pawnIndex < game.config.numberOfPawns; pawnIndex += 1) {
        if (!game.board.isHome(winner, pawnIndex)) continue;
        const cell = game.board.position.cellOf(winner, pawnIndex);
        const point = cell === null ? null : boardView.pointOf(cell);
        if (point !== null) spots.push(point);
      }
      for (const spot of spots) {
        effects.glowFlash(spot.x, spot.y, geometry.cellSize * 2.2);
        await sleep(200);
      }
      if (spots.length > 0) effects.ringFlash(spots[spots.length - 1].x, spots[spots.length - 1].y, geometry.scale);
      await sleep(800);
    } finally {
      effects.releaseExpensive();
    }
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
          ? format(t('game.sumHint'), { sum: dice[0] + dice[1], a: dice[0], b: dice[1] })
          : null,
      message: stateMessage(),
      players: PLAYERS.map((_, playerIndex) => ({
        playerIndex,
        name: seatLabel(playerIndex),
        benchCount: game.board.benchPawns(playerIndex).length,
        active: playerIndex === game.playerIndex && !game.gameOver,
      })),
    });
  }

  function stateMessage(): string | null {
    if (game.gameOver) return null; // result dialogs take over the message line
    if (noMoves) {
      return exactCornerStuck() ? t('game.exactCorner') : t('game.noMoves');
    }
    if (thinking) return `${seatLabel(game.playerIndex)} ${t('game.thinking')}`;
    if (game.isHuman(game.playerIndex)) {
      return game.remainingDice.length > 0 ? t('game.yourMove') : t('game.yourMoveRoll');
    }
    return t('game.botMove');
  }

  /**
   * The all-but-one-home standoff: nothing is legal, the last field pawn must
   * reach the corner exactly, so the refusal deserves its own explanation.
   */
  function exactCornerStuck(): boolean {
    const playerIndex = game.playerIndex;
    if (game.board.countHome(playerIndex) !== game.config.numberOfPawns - 1) return false;
    if (game.legalMoves().length > 0) return false;
    for (let pawnIndex = 0; pawnIndex < game.config.numberOfPawns; pawnIndex += 1) {
      const isFieldPawn =
        !game.board.isBench(playerIndex, pawnIndex) &&
        !game.board.isHome(playerIndex, pawnIndex) &&
        !game.board.isNewborn(playerIndex, pawnIndex);
      if (isFieldPawn) return true;
    }
    return false;
  }

  // debug harness (#7 screenshots): stage one of the three results over a live board
  if (options.resultOverride && !finished) {
    busy = true;
    const kind = options.resultOverride;
    setTimeout(() => {
      if (finished) return;
      finished = true;
      pending = [];
      selected = null;
      pawnViews.setSelected(null);
      boardView.highlight([]);
      tutorial.hide();
      options.onGameOver?.({
        kind,
        winnerSeat: kind === 'win' ? 0 : 1,
        turns: 24,
      });
    }, 1200);
  }

  // debug harness (#8 recordings): replay the real kill choreography once, engine untouched
  if (options.fxStage === 'kill') {
    setTimeout(() => {
      const pawn = pawnViews.sprite(0, 0);
      pawnViews.sync();
      const from = geometry.ring[5];
      const to = pawnViews.benchPoint(0, 0);
      pawn.position.set(from.x, from.y);
      effects.ringFlash(from.x, from.y, geometry.scale);
      void performKill(pawn, to).then(() => {
        effects.shake(3 * geometry.scale);
        window.setTimeout(() => pawnViews.sync(), 400);
      });
    }, 1500);
  }

  // desktop-only §8 dust starts once the layout gives the stage a size
  let dustStarted = false;
  const maybeStartDust = (): void => {
    if (dustStarted || root.parent === null) return;
    dustStarted = true;
    effects.startDust(root.parent.width, root.parent.height);
  };

  return {
    root,
    setHudSuppressed(value) {
      hud.setLive(!value);
      tutorial.setSuppressed(value);
    },
    layout(width, height) {
      gameLayout = computeGameLayout(width, height);
      geometry = createBoardGeometry(gameLayout.board.size, gameLayout.board.size);
      boardBase = { x: gameLayout.board.x, y: gameLayout.board.y };
      boardLayer.position.set(gameLayout.board.x, gameLayout.board.y);
      boardView.layout(geometry);
      pawnViews.layout(geometry);
      // #8 art handover, review round 2: portrait bench pawns are ~18x20 px and the
      // recesses read as debris at that scale — the chip count (×4) carries everything.
      // Landscape/TV keeps pawns at ~33x37 px with their slots.
      const portrait = gameLayout.orientation === 'portrait' && !gameLayout.isTv;
      pawnViews.setBenchVisible(!portrait);
      boardView.setBenchSlotsVisible(!portrait);
      hud.layout(width, height, gameLayout);
      tutorial.layout(width, height, gameLayout);
      root.hitArea = new Rectangle(0, 0, width, height);
      maybeStartDust();
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
      advanceHint();
    },
    dispose() {
      options.ticker.remove(tick);
      detachKeyGroup(gameGroup);
      tutorial.hide();
      root.destroy({ children: true });
    },
  };
}

function sumMovesFor(game: Game): Move[] {
  if (game.remainingDice.length !== 2 || game.rolledDice.length !== 2) return [];
  return game.legalMoves().filter((move) => move.kind === 'step' && move.consumedDice.length === 2);
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
