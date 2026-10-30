# web — HTML5 build of «Пешки» for Yandex Games

Vite + TypeScript + PixiJS. One screen for now: table surface, title, Play button.

## Commands

```sh
npm install
npm run dev      # plain Vite dev server, no SDK
npm run test
npm run build    # type-check + dist/ with index.html at its root
npm run screens  # Playwright: 3 viewport screenshots + art audit into ../docs/screens (slow, see below)
npm run package  # zip dist/ into peshki.zip (reproducible, ASCII paths)
```

`npm run screens` boots its own Vite server, shoots the game at 390×844, 1280×720 and
1920×1080 with headless Chromium under SwiftShader — WebGL2 in software. Expect a few
minutes for three shots; frame times from this setup are **not** device numbers (ticket
#8 owns the real 60 fps measurement). A run that leaves a server on port 5173 is a
failed run: the config always owns the server lifecycle (`reuseExistingServer: false`).

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
| `src/game/progress.ts` | Difficulty progression: first two completed games on novice, then the stored choice. |
| `src/game/pacing.ts` | Bot decision delay budget (0.4–0.7 s) and the hand-over pause. |
| `src/render/app.ts` | Pixi application, resize, resolution cap, ticker pause. |
| `src/ui/menu.ts` | Table surface, title, Play button. |
| `src/ui/game-screen.ts` | Board, dice HUD, human taps, paced bot seats. |
| `test/` | vitest: engine boundaries, lifecycle, facade fallback. |

`src/engine/` holds pure game logic and must not import `pixi.js`, `platform`, `render`, `ui` or
`audio`; `test/boundary.test.ts` enforces that.

| Engine file | Purpose |
|---|---|
| `game.ts` | The session: turn ownership, dice ledger, extra roll, win and draw. |
| `win.ts`, `turn-policy.ts` | Win condition (§11) and the extra-roll rule (§10.3), one place each. |
| `selectors.ts` | `MoveSelector`; `firstLegalMove` is the test-only default seat driver. |
| `bot.ts` | Three bot levels (`novice`, `normal`, `hard`): the ported heuristic, seeded noise, and a whole-roll planner. |
| `save.ts` | Snapshot, restore and the desktop-compatible JSON text. |
| `test/engine/fuzz.test.ts` | Invariant fuzzer; `PESHKI_FUZZ_GAMES=100000` for the release run. |
