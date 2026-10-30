# web — HTML5 build of «Пешки» for Yandex Games

Vite + TypeScript + PixiJS. One screen for now: table surface, title, Play button.

## Commands

```sh
npm install
npm run dev      # plain Vite dev server, no SDK
npm run test
npm run build    # type-check + dist/ with index.html at its root
npm run package  # zip dist/ into peshki.zip (reproducible, ASCII paths)
```

## Local development with the real SDK

`index.html` loads `/sdk.js`, which only exists inside the Yandex Games environment. Run the
official dev proxy in front of the dev server when the SDK is needed (`--dev-mode=true` needs no
account and no draft game):

```sh
npm run dev                                                        # terminal 1, port 5173
npx @yandex-games/sdk-dev-proxy -h http://localhost:5173 --dev-mode=true   # terminal 2
```

The game then opens at `https://localhost`; the proxy listens on port `8080` by default
(`--port` changes it). To serve built files instead of the dev server, point the proxy at the
folder: `npx @yandex-games/sdk-dev-proxy -p dist --dev-mode=true`.

The proxy serves `sdk.js` and mocks the SDK calls, so `YaGames.init()` succeeds and the debug panel
shows `LoadingAPI.ready()`.

Without the proxy the page still boots: the platform facade reports local mode in the console and
every SDK call becomes a no-op.

## Layout

| Path | Purpose |
|---|---|
| `src/platform/ysdk.ts` | The only module that touches `YaGames`. Exposes the `Platform` facade. |
| `src/platform/lifecycle.ts` | Pause/mute on tab hidden or window blur. |
| `src/game/flow.ts` | Screen flow; owns the single `LoadingAPI.ready()` signal. |
| `src/render/app.ts` | Pixi application, resize, resolution cap, ticker pause. |
| `src/ui/menu.ts` | Table surface, title, Play button. |
| `test/` | vitest: engine boundaries, lifecycle, facade fallback. |

`src/engine/` holds pure game logic and must not import `pixi.js`, `platform`, `render`, `ui` or
`audio`; `test/boundary.test.ts` enforces that.
