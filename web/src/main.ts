import { createFlow } from './game/flow';
import { effectiveDifficulty, loadGameProgress, recordCompletedGame } from './game/progress';
import { bindLifecycle } from './platform/lifecycle';
import { createPlatform } from './platform/ysdk';
import { createRenderer } from './render/app';
import { createTableSurface } from './render/table-surface';
import { loadFonts } from './render/fonts';
import { createGameScreen } from './ui/game-screen';
import type { GameScreen } from './ui/game-screen';
import { createMenu } from './ui/menu';

const TITLE = 'Пешки';

async function main() {
  const platform = createPlatform();
  await platform.boot();
  let progress = await loadGameProgress(platform);

  // Pixi Text rasterises on first draw: bundle fonts must land before any canvas
  await loadFonts();

  const app = await createRenderer();
  const table = createTableSurface();
  app.stage.addChild(table.root);

  let screen: GameScreen | null = null;
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
      onGameOver: () => {
        platform.setGameplayActive(false);
        void recordCompletedGame(platform, progress)
          .then((next) => {
            progress = next;
          })
          .catch((error) => console.warn('[progress] save failed', error));
      },
    });
    app.stage.addChild(screen.root);
    screen.layout(app.screen.width, app.screen.height);
    platform.setGameplayActive(true);
  }

  const menu = createMenu({ title: TITLE, onPlay: () => startGame() });
  app.stage.addChild(menu.root);
  menu.layout(app.screen.width, app.screen.height);
  app.renderer.on('resize', (width: number, height: number) => {
    table.layout(width, height);
    menu.layout(width, height);
    screen?.layout(width, height);
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

  if (typeof URLSearchParams !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('screen') === 'game') {
      const seed = Number.parseInt(params.get('seed') ?? '', 10);
      startGame(Number.isNaN(seed) ? undefined : seed);
    }
  }
}

void main();
