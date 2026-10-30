import { createFlow } from './game/flow';
import {
  effectiveDifficulty,
  loadGameProgress,
  pendingHints,
  persistProgress,
  recordCompletedGame,
} from './game/progress';
import type { GameProgress } from './game/progress';
import { bindLifecycle } from './platform/lifecycle';
import { createPlatform } from './platform/ysdk';
import type { Container } from 'pixi.js';
import { createRenderer } from './render/app';
import { createTableSurface } from './render/table-surface';
import { loadFonts } from './render/fonts';
import { pickLanguage, setLanguage, t } from './i18n';
import { createGameScreen } from './ui/game-screen';
import type { GameOutcome, GameScreen } from './ui/game-screen';
import { createMenu } from './ui/menu';
import { createDialog } from './ui/dialog';
import { createSettingsScreen } from './ui/settings';
import { HINT_LABEL_KEYS, HINT_ORDER, HINT_TEXT_KEYS } from './ui/hints';
import { seatLabel } from './ui/players';

/** Pause, how-to, result and settings cards share the same stack discipline. */
interface Modal {
  root: Container;
  layout(width: number, height: number): void;
  attach(): void;
  detach(): void;
  /** Settings cards are rebuilt per visit. */
  dispose?(): void;
}

function asOutcomeKind(value: string | null): GameOutcome['kind'] | undefined {
  return value === 'win' || value === 'lose' || value === 'draw' ? value : undefined;
}

async function main() {
  const debug = new URLSearchParams(window.location.search);
  const platform = createPlatform({
    // shortcut: the audio bank lands in a later ticket; the switch stores the preference for it
    setMuted: () => {},
  });
  await platform.boot();
  let progress = await loadGameProgress(platform);

  // stored manual choice beats the SDK language; ru stays the fallback
  setLanguage(progress.language ?? pickLanguage(debug.get('lang') ?? platform.language()));

  // Pixi Text rasterises on first draw: bundle fonts must land before any canvas
  await loadFonts();

  const app = await createRenderer();
  const table = createTableSurface();
  app.stage.addChild(table.root);

  let screen: GameScreen | null = null;
  const dialogStack: Modal[] = [];

  function pushSave(progress: GameProgress): void {
    void persistProgress(platform, progress).catch((error) => console.warn('[progress] save failed', error));
  }

  function closeGame(): void {
    if (screen !== null) {
      screen.dispose();
      app.stage.removeChild(screen.root);
      screen = null;
    }
  }

  function openMenu(): void {
    app.stage.addChild(menu.root);
    menu.layout(app.screen.width, app.screen.height);
  }

  /* ---- pause / exit flow ---- */

  function showPauseCard(): void {
    pauseDialog.set({
      title: t('game.pause'),
      body: null,
      actions: [
        { label: t('pause.resume'), primary: true, onTap: closePause },
        { label: t('menu.howto'), onTap: () => openHowto(0) },
        { label: t('pause.exit'), onTap: showExitConfirm },
      ],
    });
  }

  function openPause(): void {
    if (screen === null || dialogStack.includes(pauseDialog)) return;
    showPauseCard();
    openDialog(pauseDialog);
    platform.setPaused(true);
  }

  function closePause(): void {
    closeDialog(pauseDialog);
    platform.setPaused(false);
  }

  function showExitConfirm(): void {
    pauseDialog.set({
      title: t('exit.confirmTitle'),
      body: t('exit.confirmText'),
      actions: [
        {
          label: t('exit.yes'),
          primary: true,
          onTap: () => {
            closeDialog(pauseDialog);
            platform.setPaused(false);
            closeGame();
            openMenu();
          },
        },
        { label: t('exit.no'), onTap: showPauseCard },
      ],
    });
  }

  /* ---- how-to carousel: the four corrected concept pages ---- */

  function openHowto(page: number): void {
    const concept = HINT_ORDER[page];
    if (concept === undefined) return;
    const last = page === HINT_ORDER.length - 1;
    howtoDialog.set({
      title: t('howto.title'),
      label: t(HINT_LABEL_KEYS[concept]),
      body: t(HINT_TEXT_KEYS[concept]),
      actions: [
        {
          label: last ? t('common.ok') : t('howto.next'),
          primary: true,
          onTap: () => (last ? closeDialog(howtoDialog) : openHowto(page + 1)),
        },
      ],
    });
    if (!dialogStack.includes(howtoDialog)) openDialog(howtoDialog);
  }

  /* ---- result card: victory / defeat / draw share one layout ---- */

  function showResult(outcome: GameOutcome): void {
    const body = outcome.kind === 'win'
      ? t('victory.subtitle', { n: outcome.turns })
      : outcome.kind === 'lose'
        ? t('defeat.subtitle', { name: seatLabel(outcome.winnerSeat ?? 1), n: outcome.turns })
        : t('draw.answers');
    resultDialog.set({
      title: t(outcome.kind === 'win' ? 'victory.title' : outcome.kind === 'lose' ? 'defeat.title' : 'draw.title'),
      body,
      actions: [
        {
          label: t('result.again'),
          primary: true,
          onTap: () => {
            closeDialog(resultDialog);
            closeGame();
            startGame();
          },
        },
        {
          label: t('result.menu'),
          onTap: () => {
            closeDialog(resultDialog);
            closeGame();
            openMenu();
          },
        },
      ],
    });
    openDialog(resultDialog);
  }

  /* ---- settings: sound and language through the same Platform blob ---- */

  function openSettings(): void {
    const settings = createSettingsScreen(
      { soundOn: progress.sound, language: progress.language ?? pickLanguage(platform.language()) },
      {
        onToggleSound(soundOn) {
          progress = { ...progress, sound: soundOn };
          pushSave(progress);
        },
        onPickLanguage(language) {
          progress = { ...progress, language };
          setLanguage(language);
          pushSave(progress);
          menu.layout(app.screen.width, app.screen.height);
        },
        onClose() {
          closeDialog(modal);
        },
      },
    );
    const modal: Modal = {
      root: settings.root,
      layout: (width, height) => settings.layout(width, height),
      attach: () => settings.attach(),
      detach: () => settings.detach(),
      dispose: () => settings.root.destroy({ children: true }),
    };
    openDialog(modal);
  }

  /* ---- shared modal stack ---- */

  function openDialog(modal: Modal): void {
    app.stage.addChild(modal.root);
    modal.layout(app.screen.width, app.screen.height);
    modal.attach();
    dialogStack.push(modal);
  }

  function closeDialog(modal: Modal): void {
    const index = dialogStack.indexOf(modal);
    if (index >= 0) dialogStack.splice(index, 1);
    app.stage.removeChild(modal.root);
    modal.detach();
    modal.dispose?.();
  }

  function startGame(seed?: number): void {
    if (screen !== null) return;
    app.stage.removeChild(menu.root);
    app.stage.addChild(table.root); // table stays under the game
    // debug harness (art review #6): ?layers=a,b hides everything else
    const params = new URLSearchParams(window.location.search);
    const layerParam = params.get('layers');
    const visibleLayers = layerParam === null
      ? undefined
      : new Set(layerParam.split(',').filter((name) => name.length > 0));
    screen = createGameScreen({
      difficulty: effectiveDifficulty(progress),
      ticker: app.ticker,
      seed,
      visibleLayers,
      debug: params.has('audit'),
      resultOverride: asOutcomeKind(params.get('result')),
      onPauseRequest: openPause,
      hints: pendingHints(progress),
      onHintDismissed: (id) => {
        if (progress.hintsSeen.includes(id)) return;
        progress = { ...progress, hintsSeen: [...progress.hintsSeen, id] };
        pushSave(progress);
      },
      onGameOver: (outcome) => {
        platform.setGameplayActive(false);
        void recordCompletedGame(platform, progress)
          .then((next) => {
            progress = next;
          })
          .catch((error) => console.warn('[progress] save failed', error));
        showResult(outcome);
      },
    });
    app.stage.addChild(screen.root);
    screen.layout(app.screen.width, app.screen.height);
    platform.setGameplayActive(true);
  }

  const menu = createMenu({
    onPlay: () => startGame(),
    // resume entry point: ticket #16's autosave plugs in here
    onContinue: undefined,
    onHowto: () => openHowto(0),
    onSettings: openSettings,
  });

  const pauseDialog = createDialog({ title: '', actions: [ { label: '', onTap: () => {} } ] });
  pauseDialog.group.onEscape = closePause;
  const howtoDialog = createDialog({ title: '', actions: [ { label: '', onTap: () => {} } ] });
  howtoDialog.group.onEscape = () => closeDialog(howtoDialog);
  const resultDialog = createDialog({ title: '', actions: [ { label: '', onTap: () => {} } ] });
  resultDialog.group.onEscape = () => {
    closeDialog(resultDialog);
    closeGame();
    openMenu();
  };

  app.stage.addChild(menu.root);
  menu.layout(app.screen.width, app.screen.height);

  app.renderer.on('resize', (width: number, height: number) => {
    table.layout(width, height);
    menu.layout(width, height);
    screen?.layout(width, height);
    for (const modal of dialogStack) modal.layout(width, height);
  });
  table.layout(app.screen.width, app.screen.height);

  bindLifecycle(window, () => document.hidden, { setPaused: (paused) => platform.setPaused(paused) });
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  // The menu is on screen and accepts pointer input, so the game is playable.
  createFlow(platform).menuInteractive();

  // ?audit=1 — screenshot harness hooks; not part of the shipping surface
  if (typeof URLSearchParams !== 'undefined' && new URLSearchParams(window.location.search).has('audit')) {
    (window as unknown as Record<string, unknown>).__peshki = { app };
  }

  // ?screen=game&seed=… — debug route used by the screenshot battery
  const params = new URLSearchParams(window.location.search);
  if (params.get('screen') === 'game') {
    const seed = Number.parseInt(params.get('seed') ?? '', 10);
    startGame(Number.isNaN(seed) ? undefined : seed);
  }

  // ?modal=pause|howto|settings — #7 screenshot harness over whatever is on stage
  const modal = params.get('modal');
  if (modal === 'pause' || modal === 'howto' || modal === 'settings') {
    setTimeout(() => {
      if (modal === 'pause') openPause();
      if (modal === 'howto') openHowto(0);
      if (modal === 'settings') openSettings();
    }, 1500);
  }

  // Escape while playing (no dialog open) opens pause for keyboard-only seats
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (dialogStack.length === 0 && screen !== null) openPause();
  });
}

void main();
