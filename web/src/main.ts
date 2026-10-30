import { createFlow } from './game/flow';
import { bindLifecycle } from './platform/lifecycle';
import { createPlatform } from './platform/ysdk';
import { createRenderer } from './render/app';
import { createMenu } from './ui/menu';

const TITLE = 'Пешки';

async function main() {
  const platform = createPlatform();
  await platform.boot();

  const app = await createRenderer();
  const menu = createMenu({ title: TITLE });
  app.stage.addChild(menu.root);
  menu.layout(app.screen.width, app.screen.height);
  app.renderer.on('resize', (width: number, height: number) => menu.layout(width, height));

  bindLifecycle(window, () => document.hidden, { setPaused: (paused) => platform.setPaused(paused) });
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  // The menu is on screen and accepts pointer input, so the game is playable.
  createFlow(platform).menuInteractive();
}

void main();
