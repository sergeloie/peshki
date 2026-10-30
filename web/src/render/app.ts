import { Application } from 'pixi.js';

export async function createRenderer(): Promise<Application> {
  const app = new Application();

  await app.init({
    background: 0x1a0c07,
    resizeTo: window,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    antialias: true,
  });

  document.body.appendChild(app.canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      app.stop();
    } else {
      app.start();
    }
  });

  return app;
}
