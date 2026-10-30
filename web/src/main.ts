import { createFlow } from './game/flow';
import { bindLifecycle } from './platform/lifecycle';
import { createPlatform } from './platform/ysdk';
import { createRenderer } from './render/app';
import { createGameScreen } from './ui/game-screen';
import type { GameScreen } from './ui/game-screen';
import { createMenu } from './ui/menu';

const TITLE = 'Пешки';

async function main() {
  const platform = createPlatform();
  await platform.boot();

  const app = await createRenderer();
  let screen: GameScreen | null = null;
  const menu = createMenu({
    title: TITLE,
    onPlay: () => {
      app.stage.removeChild(menu.root);
      screen = createGameScreen({ onGameOver: () => platform.setGameplayActive(false) });
      app.stage.addChild(screen.root);
      screen.layout(app.screen.width, app.screen.height);
      platform.setGameplayActive(true);
    },
  });
  app.stage.addChild(menu.root);
  menu.layout(app.screen.width, app.screen.height);
  app.renderer.on('resize', (width: number, height: number) => {
    menu.layout(width, height);
    screen?.layout(width, height);
  });

  bindLifecycle(window, () => document.hidden, { setPaused: (paused) => platform.setPaused(paused) });
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  // The menu is on screen and accepts pointer input, so the game is playable.
  createFlow(platform).menuInteractive();
}

void main();
