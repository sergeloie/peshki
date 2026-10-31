# Platform acceptance checklist — HTML5 «Пешки» (#9)

Source of the requirement list: <https://yandex.ru/dev/games/doc/ru/concepts/requirements.md>
(revision `r21861215`, page date 27 October 2026, read 31 October 2026).
Deprecated items (1.5, 1.6.1.3, 1.6.1.4, 1.6.2.3, 1.16, 1.17, 2.5, 2.6, 2.10–2.12, 3.1–3.3,
3.8, 5.5, 5.7, 5.8, 5.10, §7) are not listed: they carry no obligation.

Build under review: `master` @ `2d3b1ab` (ticket #8 merged) plus the evidence commit of this ticket.
Every row is answered with exactly one status:
`satisfied`, `satisfied (manual check outstanding)`, `not applicable — <reason>`,
`not satisfied — <reason>`.

## Verdict: **not submittable yet**

Requirement **1.12 (monetization connected) is not met** and the archive will be rejected as it stands.
The platform facade already exposes `showAdBreak()` and `showRewarded()`
(`web/src/platform/ysdk.ts:109-135`), and nothing calls them:

```
$ grep -rn "showAdBreak\|showRewarded" web/src
web/src/platform/ysdk.ts:109:    showAdBreak() {
web/src/platform/ysdk.ts:119:    showRewarded(_placement) {
```

No advertisement is ever requested and no in-app purchase exists, so §4 (ads) is unreachable and
1.12 stays open. This is the one deliberate debt of the iteration — the monetization ticket, not a
defect of this build.

What still has to happen before submission, in order:

1. **Monetization (1.12, §4)** — one interstitial on a logical pause (match start or result card)
   plus, optionally, a rewarded placement; then the pause/mute seam that already exists
   (`setPaused`, `setMuted`, `GameplayAPI`) covers 4.7 and 4.2 as written.
2. **Console draft and promo materials (§5, 2.3, 2.7, 5.6, 5.12)** — the draft does not exist yet.
   Texts are ready in `docs/store-draft.md`; icon, cover and the screenshot set are marketing work.
3. **Cloud-save flag (1.11)** — tick "Игра использует облачные сохранения" when the draft is created;
   the game writes through `player.setData` and would otherwise lose progress on reload.
4. **Support e-mail (6.1, recommended)** — publisher's address, not a build property.
5. **The manual pass below (M1–M12)** — no phone, no TV remote and no real Yandex environment exist on
   this bench; every row marked "manual check outstanding" depends on it.
6. **Rating (2.13, recommended)** — appears only after publication.

## How to reproduce the evidence

```
cd web
npm ci                     # clean checkout
npm test                   # 20 files, 117 tests
npm run build              # tsc --noEmit && vite build
npm run package            # writes web/peshki.zip and prints the file list
node node_modules/@playwright/test/cli.js test tests/acceptance.spec.ts --workers=1
node node_modules/@playwright/test/cli.js test -g "<chunk>" --workers=1 --timeout=180000
```

The screenshot battery is `web/tests/screens.spec.ts` (`npm run screens`). On this host it wedges a
worker after three to seven chromium cycles, so it is run one chunk per command with `--workers=1`
and a raised per-test timeout; `docs/screens/*` in this commit was produced that way (see
"Evidence artefacts" at the end).

## Archive proof

Run from `web/` with `node_modules` present, after `npm run build`:

```
$ npm run package
peshki.zip: 425428 bytes (0.41 MB), 19 files
  assets/CanvasPool-D071ZhP4.js
  assets/RenderTargetSystem-CsP-H84Z.js
  assets/browserAll-D0owibcb.js
  assets/canvasUtils-G1F85v5_.js
  assets/getTexelRangeRects-Don6IJIp.js
  assets/getTextureBatchBindGroup-hK4Xhp7N.js
  assets/index-6GRxplCg.css
  assets/index-Dv6Ru_Qn.js
  assets/init-CaJGJYQL.js
  assets/playfair-display-600-cyrillic-oLY6jnZ7.woff2
  assets/playfair-display-600-latin-CZLGqjJe.woff2
  assets/pt-mono-400-cyrillic-CteInIPE.woff2
  assets/pt-mono-400-latin-3-3stVoC.woff2
  assets/pt-sans-400-cyrillic-BgFH0IXl.woff2
  assets/pt-sans-400-latin-Cwy9XeGQ.woff2
  assets/pt-sans-700-cyrillic-TNhnPAH_.woff2
  assets/pt-sans-700-latin-DmHhLLdt.woff2
  assets/webworkerAll-DsNhsONJ.js
  index.html
```

- **Size** 425 428 bytes (0.41 MB) compressed, 881 028 bytes (0.84 MB) uncompressed. The 100 MB
  limit of 1.21 is not close.
- **File count** 19, one folder (`assets/`), no empty directories.
- **`index.html` at the archive root**, first entry of the central directory after the sorted list.
- **ASCII, no spaces** — `web/scripts/package.mjs:41` throws on any archive path outside
  `[\x21-\x7e]`; the run above would have failed instead of printing a list.
- **Reproducible** — two consecutive runs give the same archive:
  `sha256 0607e86ea82f13b101702349487a00941806829b3f963bccd43662b3297a2fe2`.
- **No absolute Yandex CDN URL** in the bundle:

```
$ Get-ChildItem web/dist -Recurse -File | Select-String "games\.s3\.yandex\.net"
# (no output — 0 files matched)
$ Select-String -Path web/dist/index.html -Pattern "src=|href="
    <script src="/sdk.js" ></script>
    <script type="module" crossorigin src="./assets/index-Dv6Ru_Qn.js"></script>
    ...
```

  `/sdk.js` is the tag the SDK documentation prescribes (the SDK is served from the hosting root, and
  the archive root is the game root per 1.22); every other URL is relative (`vite.config.ts`
  `base: './'`).

---

## 1. Technical requirements

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 1.1 | Yandex Games SDK is embedded | `<script src="/sdk.js">` in the head, `YaGames.init()` awaited before the first screen inside the facade; absence falls back to local mode | `web/index.html:28`, `web/src/platform/ysdk.ts:54-73`, `web/test/platform.test.ts` › "degrades to local mode when YaGames is absent" | satisfied |
| 1.2 | No registration or third-party login to launch | No auth UI at all; the game boots straight into the menu | `grep -rn "openAuthDialog\|getPlayer" web/src` → only `ysdk.ts`; `docs/screens/screens-menu-ru-portrait.png` | satisfied |
| 1.2.1 | Auth only after a deliberate in-game button press, benefits named | Not offered — the game never requests authorization | same grep as 1.2 (no auth entry point) | not applicable — the build has no authorization step to gate |
| 1.2.2 | Guest play exists and progress is kept | Guest play is the only mode; the progress blob is written for whoever `getPlayer()` returns, guest or authorized | `web/src/platform/ysdk.ts:89-99`, `web/test/progress.test.ts` › "writes one small JSON blob and counts the finished game"; reload proof is M4 | satisfied (manual check outstanding) |
| 1.3 | Sound stops when focus is lost | `bindLifecycle` (blur + visibilitychange) and the SDK `game_api_pause` both land in `setMuted`; two independent gates (player preference and system) | `web/test/lifecycle.test.ts` › "pauses and mutes on focus loss, resumes on focus", `web/test/audio.test.ts` › "the system gate (focus loss / platform pause) mutes scheduling too"; device proof M6 | satisfied (manual check outstanding) |
| 1.4 | Payments only through the SDK, no external purchases | No payments exist; no `<a href>`, no checkout code | `grep -rn "payments\|getPayments" web/src` → 0 matches | not applicable — the build sells nothing |
| 1.6 | Matches the devices declared in the draft | Declaration and its honest WebGL2 floor are written out; it must be copied into the console as is | `docs/store-draft.md` §Supported platforms | satisfied (manual check outstanding) — awaiting the draft |
| 1.6.1.1 | Mobile: full screen during launch and play | `html,body{height:100%;overflow:hidden}` plus a canvas resized to the window; no browser chrome is reserved, no scrollbar appears | `web/index.html:10-27`, `docs/screens/screens-game-ru-portrait.png`, `web/tests/acceptance.spec.ts` › "browser surface: no scroll, no selection, no page errors — phone portrait" | satisfied |
| 1.6.1.2 | Keyboard appears automatically on a text field | There are no text fields anywhere in the game | `grep -rn "<input\|contenteditable\|prompt(" web/src` → 0 matches | not applicable — no text input |
| 1.6.1.5 | The game is fully playable by gestures | One tap on a legal cell moves, one tap on the roll plate rolls; no gesture is required beyond tap | `docs/screens/screens-game-ru-portrait.png`, `web/src/ui/game-screen.ts` tap handling; device proof M2 | satisfied (manual check outstanding) |
| 1.6.1.6 | No system media player on mobile browsers | All sound is synthesised through Web Audio; no media element is created | `web/test/audio.test.ts` › "no `<audio>`, `<video>` or media-element creation anywhere in web/src"; `grep -c "<audio" web/dist/assets/*.js` → 0 | satisfied |
| 1.6.1.7 | No WebGL notice on opening | No capability check, notice or splash exists; the canvas is created directly | `grep -rn "WebGL" web/src` → 0 matches (only Pixi internals in the bundle) | satisfied |
| 1.6.1.8 | Long press selects nothing and opens no context menu | `user-select:none`, `touch-action:none`, `-webkit-tap-highlight-color:transparent` and a global `contextmenu` preventDefault | `web/index.html:10-27`, `web/src/main.ts:374`, `web/tests/acceptance.spec.ts` › "browser surface: no scroll, no selection, no page errors — phone portrait" | satisfied |
| 1.6.2.1 | Desktop: the active field stretches to the edge of the free area | The board is `min(free height, free width minus the 380 px panel)` and centres in the remainder, so at 1280×720 it is 704 px in a 720 px window — an 8 px edge | `web/src/render/hud.ts:104-119`, `web/test/layout.test.ts` › "board and HUD live inside the viewport: desktop 16:9 1280x720", `docs/screens/screens-game-ru-landscape.png` | satisfied |
| 1.6.2.2 | Long side of the active field ≤ 2× the short side | The board is square by construction (`size` is one number for both axes) | `web/test/layout.test.ts` (10 viewports, square assertion), `docs/screens/screens-game-en-landscape.png` | satisfied |
| 1.6.2.4 | Mouse and keyboard by default, layout-independent | Pointer taps plus Tab/arrows/Enter/Space/Esc; the handlers read `event.key`, never a character | `web/src/ui/keys.ts:24-44`, `web/test/layout.test.ts`; TV walk in `docs/screens/tv-input-after-activation.png` | satisfied |
| 1.6.2.5 | No system media player on desktop browsers | Same as 1.6.1.6 | `web/test/audio.test.ts` › "no `<audio>`, `<video>` or media-element creation anywhere in web/src" | satisfied |
| 1.6.2.6 | No OS- or app-reserved key combinations | Only unmodified Tab, arrows, Enter, Space and Esc are handled; nothing uses a modifier | `web/src/ui/keys.ts:24-44`, `web/src/main.ts:415-418` | satisfied |
| 1.6.2.7 | Interacting with the field selects nothing and opens no context menu | Same mechanism as 1.6.1.8, proven at 1280×720 | `web/tests/acceptance.spec.ts` › "browser surface: no scroll, no selection, no page errors — desktop" | satisfied |
| 1.6.3.1 | TV: full screen area, fullscreen mode available | The page fills the viewport at 1920×1080 and the layout scales with `TV_PAD`; the board occupies 1056 of 1080 px | `docs/screens/tv.png`, `web/src/render/hud.ts:91` | satisfied (manual check outstanding) — no real TV |
| 1.6.3.2 | Arrows on the remote are enough to play a whole game | A linear focus walk: roll plate first, then every legal target; arrows move, Enter activates | `web/tests/screens.spec.ts` › "tv input: keyboard reaches the roll and legal targets without a pointer", `docs/screens/tv-input-after-activation.png`; remote proof M10 | satisfied (manual check outstanding) |
| 1.6.3.3 | Back and OK are handled | OK is Enter and activates the focused entry; Back (Esc/`BrowserBack`) closes the top dialog or opens the pause card | `web/src/ui/keys.ts:24-44`, `web/src/main.ts:346-355`; remote proof M10 | satisfied (manual check outstanding) |
| 1.6.3.4 | No in-app purchases on TV | There are no purchases at all | `grep -rn "payments" web/src` → 0 matches | not applicable — the build has no purchases |
| 1.6.3.5 | No links to other games of the developer | No links of any kind | `grep -rn "https\?://" web/src` → 0 matches | not applicable — no cross-promotion exists |
| 1.7 | No absolute `games.s3.yandex.net` URLs | Nothing absolute is referenced; the SDK script is the documented root-relative tag | `Get-ChildItem web/dist -Recurse \| Select-String "games\.s3\.yandex\.net"` → 0 matches (Archive proof) | satisfied |
| 1.8 | Interactive elements fit the screen and are comfortable | Every control is ≥46 px tall (dialog and menu buttons 52–56, settings rows 46, pause 48), the board is at least 30 % of the short side on all ten tested viewports | `web/test/layout.test.ts` (10 sizes), `web/src/ui/menu.ts:55-58`, `web/src/ui/settings.ts:168` | satisfied |
| 1.9 | Progress survives reload and orientation change | Autosave writes a versioned snapshot after every completed turn (debounced), flushes on hide and on pause; the snapshot carries seat, turn, dice ledger and board; orientation change only re-lays out | `web/test/match-save.test.ts` (13 cases incl. "restores the saved seat, turn and dice ledger", "restores the board and the human seats of a mid-game snapshot"), `web/test/progress.test.ts`; device proof M4, M5 | satisfied (manual check outstanding) |
| 1.10.1 | Nothing is clipped or outside the screen, on resize and rotation | One layout function for all four aspect classes; the layout matrix asserts the board box inside the viewport and the HUD is nailed to the safe area | `web/test/layout.test.ts` (10 viewports incl. square and 4:3), `web/test/layout.test.ts` › "env insets push the board and tray clear of notches", 32 screenshots in `docs/screens/` | satisfied |
| 1.10.2 | No browser scrollbar and no swipe-to-refresh | `overflow:hidden` on both root elements, `overscroll-behavior:none`, `touch-action:none`; a wheel event moves nothing and the document has no overflow at either viewport | `web/index.html:10-27`, `web/tests/acceptance.spec.ts` › "browser surface: no scroll, no selection, no page errors — phone portrait" and "— desktop" | satisfied |
| 1.10.3 | Elements and texts do not overlap | Every state was re-shot in both languages and both orientations; the longest strings (how-to body, defeat line) fit their cards | `docs/screens/screens-howto-en-landscape.png`, `docs/screens/screens-win-ru-portrait.png`, the other 30 files in `docs/screens/screens-*.png` | satisfied |
| 1.11 | Cloud saves ticked in the draft when used | The game writes through `player.setData(..., true)`; the draft does not exist yet, so the box is still to be ticked | `web/src/platform/ysdk.ts:89-92`, `docs/store-draft.md` §Draft flags | satisfied (manual check outstanding) — console draft |
| 1.12 | Monetization connected (advertising or in-app purchases) | **Not connected.** The facade exposes `showAdBreak()`/`showRewarded()` but nothing calls them and there are no purchases | `grep -rn "showAdBreak\|showRewarded" web/src` → declarations only; see "Verdict" | not satisfied — monetization is the next iteration |
| 1.13.1–1.13.6 | Rules for in-app purchases | The build has no purchases, so none of the sub-items can apply | `grep -rn "payments" web/src` → 0 matches | not applicable — no in-app purchases |
| 1.14 | No technical errors, hangs or crashes during play and on rotation, long press, gestures, tab switching, history navigation | Global `contextmenu` and blur/visibility handlers; a browser session at two viewports records zero page errors and zero console errors; rotation only re-lays out | `web/tests/acceptance.spec.ts` (both viewports, `pageErrors`/`consoleErrors` asserted empty), `web/test/lifecycle.test.ts`; device proof M6, M7, M8 | satisfied (manual check outstanding) |
| 1.15 | Finished look: all texts, graphics, controls and mechanics present | Menu, how-to, settings, game, pause, victory, defeat and draw all exist in both languages | 32 screenshots `docs/screens/screens-*-{ru,en}-{portrait,landscape}.png`, `web/test/i18n.test.ts` › "carries exactly the same key set in both languages" | satisfied |
| 1.18 | The game works from any URL it is opened at | Every asset is relative (`base: './'`), so the build runs from any folder; the only root-relative URL is the documented `/sdk.js`, and without the SDK the game still boots in local mode | `web/vite.config.ts:5`, `web/dist/index.html` (`./assets/...`), `web/test/platform.test.ts` › "degrades to local mode when YaGames is absent" | satisfied |
| 1.19.1 | SDK initialised exactly as documented | `YaGames.init()` with no arguments, awaited before the first frame; no undocumented options | `web/src/platform/ysdk.ts:61` | satisfied |
| 1.19.2 | `LoadingAPI.ready()` called when the player can start | Called once, when the menu becomes interactive and accepts pointer input | `web/src/game/flow.ts:11-15`, `web/src/main.ts:377`, `web/test/lifecycle.test.ts` › "signals ready exactly once, when the menu becomes interactive" | satisfied |
| 1.19.3 | `GameplayAPI.start()/stop()` match gameplay moments | `setGameplayActive(true)` on the first match, `false` when the game reports its outcome; the API is never touched before a match or on the menu | `web/src/platform/ysdk.ts:33-51`, `web/src/main.ts:331,318`, `web/test/platform.test.ts` › "does not touch GameplayAPI before a match starts" | satisfied |
| 1.19.4 | `game_api_pause`/`game_api_resume` handled as documented | Both events set a flag that folds into one pause state together with blur/hidden; sound and gameplay respond to the combined state | `web/src/platform/ysdk.ts:63-72`, `web/test/platform.test.ts` › "stays paused while either the app or the platform is paused" | satisfied |
| 1.20.1 | Works in Yandex Browser, Chrome, Firefox, Opera, Safari, Yandex app | ES2022 + WebGL2 build; declared browsers are those shipping WebGL2 | `docs/store-draft.md` §Supported platforms; manual proof M1, M11 | satisfied (manual check outstanding) |
| 1.20.2 | Works on Windows 8/10 and macOS 10.6+ | Same bundle; desktop layout verified at 1280×720, 1024×768, 1680×1050 | `web/test/layout.test.ts`, `docs/screens/screens-game-ru-landscape.png`; manual M1 | satisfied (manual check outstanding) |
| 1.20.3 | Works on Android 5.0+ and iOS 9.0+ | **Not true for those floors.** The renderer is PixiJS 8 on WebGL2; Pitfall: iOS before 15 and Android Chrome before ~56 have no usable WebGL2. The declaration therefore names iOS 15+/Android 8+ instead of the platform's generic list | `web/src/render/app.ts:6-12` (Pixi 8, WebGL2), `docs/store-draft.md` §Supported platforms; manual M1 | not satisfied — as written the row demands 2013–2015 operating systems; the honest fix is to declare a narrower list (see 1.6) |
| 1.20.4 | Works on Android TV | TV layout at 1920×1080 with 24 px overscan margins and a d-pad-only path; no Android TV device on the bench | `docs/screens/tv.png`, `web/tests/screens.spec.ts` › "tv input: …" | satisfied (manual check outstanding) — no Android TV here |
| 1.21 | All files ≤ 100 MB unpacked | 0.84 MB unpacked, 0.41 MB in the archive | Archive proof above | satisfied |
| 1.22 | `index.html` in the archive root, no spaces or Cyrillic in names | The packaging script refuses a non-ASCII or spaced path and asserts `dist/index.html` | `web/scripts/package.mjs:38-50`, Archive proof above | satisfied |
| 1.23 | No interactive AI | No model, no network call, no generated content at runtime; art is procedural canvas drawing | `grep -rn "https\?://" web/src` → 0 matches, `grep -rn "fetch(" web/src` → 0 matches | satisfied |
| 1.24 | Updates keep the concept, no wholesale replacement | First release; the save blob is versioned so a future build can migrate rather than discard | `web/src/engine/save.ts`, `web/test/match-save.test.ts` › "discards an older version and offers no continue entry" | not applicable — first release, nothing to preserve |

## 2. User-experience requirements

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 2.1 | Content, convenience and gameplay are worked through | The rules are implemented in full, 117 unit tests including 22 numbered engine scenarios, four how-to pages, hints for the first game, pause, sound and language settings | `npm test` output (117 passed), `docs/screens/` (32 states) | satisfied |
| 2.2 | Controls fully described in the game or in the draft | Four-page «Как играть» from menu and from pause, plus the first-match hint card; the draft text repeats the controls | `docs/screens/screens-howto-ru-portrait.png`, `docs/screens/screens-hint-portrait.png`, `docs/store-draft.md` §How to play | satisfied |
| 2.3 | Matches the genre declared in the draft | Declared as a board game (настольная игра); no draft exists yet to compare against | `docs/store-draft.md` §Genre | satisfied (manual check outstanding) — console draft |
| 2.4 | Meets at least one "has game mechanics" criterion | Dice-driven movement with choice of die, captures that reset progress, a home straight with an exact-landing rule, a turn loop with bonus rolls | `web/test/engine/*.test.ts` (22 numbered scenarios), `web/test/pacing.test.ts` | satisfied |
| 2.7 | Content matches the declared age rating | No text, no violence beyond a pawn returning to the bench, no purchases, no chat; the recommendation is 0+ | `web/src/i18n/ru.ts`, `web/src/i18n/en.ts` (full string set), `docs/store-draft.md` §Age rating | satisfied (manual check outstanding) — rating is declared in the console |
| 2.8 | Rising difficulty and a clear setting | Three bot levels, and the first two completed games are forced to «Новичок»; the setting is a club board with named opponents | `web/test/progress.test.ts` › "forces novice for the first two completed games, then honours the choice", `web/test/engine/bot.test.ts` › "reports the difficulty matrix and a monotone ladder over fixed seeds" | satisfied |
| 2.9 | More than 10 minutes of content, or a reason to replay | A match measured 24 turns in the result card shot; each game is 10–20 minutes and «Ещё партия» restarts with one tap | `docs/screens/screens-win-ru-portrait.png` («Партия за 24 хода», «Ещё партия»), `web/test/engine/victory.test.ts` | satisfied |
| 2.13 | Rating above 30 | Cannot be answered before publication; the first screen is the designed menu, and the rating is a property of the audience, not of the archive | — | not satisfied — the requirement is measured after release (3-week window) and no build property can guarantee it |
| 2.14 | Language auto-detected through the SDK | `sdk.environment.i18n.lang` feeds `pickLanguage`, ru is the fallback, a stored manual choice wins | `web/src/main.ts:57`, `web/test/i18n.test.ts` › "falls back to ru for unknown locales and keeps en on en*", `docs/screens/screens-menu-en-portrait.png` | satisfied |

## 3. Content requirements

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 3.4.2 | No black-magic material, no purchases in fortune-telling games | Nothing occult, no purchases | `web/src/i18n/ru.ts`, `web/src/i18n/en.ts` (complete text set) | not applicable — the content is a wooden board game |
| 3.4.3 | No realistic violence or cruelty to animals, children, the elderly | The only "violence" is a porcelain pawn going back to its bench, drawn as a hop | `docs/screens/fx-kill-landscape.png` | not applicable — no such scenes |
| 3.4.4 | No political images or references | None in the art or the texts | `docs/art-direction.md` §1-12 (art direction), `web/src/i18n/*.ts` | not applicable — no political content |
| 3.4.5 | No religious images or references | None | `web/src/i18n/*.ts`, `docs/art-direction.md` | not applicable — no religious content |
| 3.4.6 | No predictions about the player's life or health | None | `web/src/i18n/*.ts` | not applicable — no such content |
| 3.5 | The creator owns all materials | Art and sound are procedural (no third-party assets); the three bundled typefaces ship with their licences | `web/fonts/LICENSE.playfair-display.txt`, `LICENSE.pt-sans.txt`, `LICENSE.pt.txt`; `docs/art-direction.md` §3 | satisfied |
| 3.6 | Not a copy of another catalogue game | A classic board game with its own rule set (die-choice movement, exact-corner finish, bonus rolls); a duplicate search in the catalogue has not been done | `docs/art-direction.md`, `web/test/engine/victory.test.ts` | satisfied (manual check outstanding) — a human must search the catalogue for a duplicate |
| 3.7 | Nothing from the real world can be won | No prizes, no promo codes, no currency | `grep -rn "promo\|prize\|промокод" web/src` → 0 matches | satisfied |
| 3.9 | Embedded video cannot lead to external resources, no YouTube | No video is embedded | `grep -rn "<video\|<iframe" web/src` → 0 matches | not applicable — no video |

## 4. Advertising requirements

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 4.1 | Ads only through the SDK, no third-party ads | No ads at all today; the facade is the only place that can call `adv.*` and it is never called | `web/src/platform/ysdk.ts:109-135`, `grep -rn "showAdBreak" web/src` | not applicable — nothing to check until 1.12 is done |
| 4.2 | The turn survives an ad and the return | The autosave snapshot is written before the pause card and on every turn end, so a return lands on the same position | `web/src/main.ts:136-147,308-311`, `web/test/match-save.test.ts` › "writes once per completed turn, after the debounce" | not applicable — no ads are shown yet |
| 4.3 | Ad blocks have the orientation of the game | The game runs both orientations, so only SDK-driven orientation matters; nothing is custom-built | — | not applicable — no ad blocks are placed by the game |
| 4.4 | Ads do not obstruct play and show only at logical pauses | The natural slots are the menu and the result card, both outside the turn | `web/src/main.ts:196-226` | not applicable — no ads yet |
| 4.5 | Rewarded video optional, benefit explicit | `showRewarded(placement)` exists in the facade but no button offers it | `web/src/platform/ysdk.ts:119-135` | not applicable — no rewarded mechanic exists |
| 4.6 | No custom or imitated ad blocks | The game draws no advertising surface | `docs/screens/` (32 states, no ad surface) | not applicable — no ad blocks are drawn |
| 4.7 | Interstitial and rewarded pause the sound and the gameplay | The pause seam mutes both gates and calls `GameplayAPI.stop()`; the ad ticket must call it | `web/src/platform/ysdk.ts:33-51`, `web/test/platform.test.ts` › "stays paused while either the app or the platform is paused" | not applicable — no ads are shown yet |

## 5. Draft fields and promo materials

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 5.1.1 | Promo materials are made from this game | No promo materials are produced yet | — | not satisfied — marketing iteration, no icon/cover exists |
| 5.1.1.1 | No other game's gameplay, no shared materials | n/a until materials exist | — | not satisfied — nothing produced yet |
| 5.1.1.2 | Screenshots show real gameplay on ≥70 % of the image | Every committed screenshot is the live canvas, edge to edge, no framing | `docs/screens/screens-*.png` (32 files, 100 % gameplay) | satisfied |
| 5.1.1.3 | Video shows real gameplay ≥70 % of its length | No video is produced | — | not satisfied — no video produced |
| 5.1.2 | Materials show the point of the game | The 32 screenshots cover menu, rules, a live board, pause, and all three endings | `docs/screens/` | satisfied |
| 5.1.3 | The title is identical in the game and in all draft fields and materials | One title string, «Пешки» / «Peshki», used in the game and drafted for the console | `web/src/i18n/ru.ts:5`, `web/src/i18n/en.ts`, `docs/store-draft.md` §Title | satisfied (manual check outstanding) — only once the draft exists |
| 5.2 | All mandatory fields filled, screenshots added | The draft does not exist; texts are drafted, icon/cover/screenshot upload is marketing | `docs/store-draft.md` | not satisfied — console draft not created yet |
| 5.3 | Field texts meet the standards shown in the form | Lengths cannot be checked without the form; the drafts are short enough for every known limit | `docs/store-draft.md` (lengths noted per field) | not satisfied — depends on 5.2 |
| 5.4 | Tags and keywords match the content | Drafted tag list matches the mechanics | `docs/store-draft.md` §Tags | satisfied (manual check outstanding) — typed into the console |
| 5.6 | Icon and cover are not screenshots | No icon or cover exists | — | not satisfied — marketing iteration |
| 5.9 | Black bars are only part of the game, not letterboxing | Screenshots are the full viewport with no letterboxing; the portrait board is centred on table wood, not black | `docs/screens/screens-game-ru-portrait.png`, `docs/screens/screens-game-en-landscape.png` | satisfied |
| 5.11 | No repeated characters to pass length checks, no duplicated texts across fields | Title, about and how-to are distinct texts with no filler runs | `docs/store-draft.md` | satisfied |
| 5.12 | The title is unique in the catalogue | Not checked — needs the console search | — | not satisfied — a catalogue name search is required before submission |

## 6. Recommended requirements

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 6.1 | A support e-mail is listed | No address is set; it belongs to the publisher profile | — | not satisfied — publisher decision, not a build property |
| 6.2 | Sound can be turned off | Settings has a sound switch; the choice is stored in the progress blob and gates audio independently of the system gate | `docs/screens/screens-settings-ru-portrait.png`, `web/test/audio.test.ts` › "the sound preference mutes scheduling" | satisfied |
| 6.3 | The game can be paused | Round pause button in the HUD on every screen, Esc on the keyboard, Back on a TV remote; the pause card also stops the bots | `docs/screens/screens-pause-ru-landscape.png`, `web/src/main.ts:124-147` | satisfied |
| 6.4 | No console errors on opening the devtools | A full session at 390×844 and 1280×720 records zero page errors and zero console errors (the local-mode `/sdk.js` 404 is the only excluded message, and it cannot happen on the platform) | `web/tests/acceptance.spec.ts` (both viewports) | satisfied |
| 6.5 | The title has no words "игра"/"game" | «Пешки» / «Peshki» | `web/src/i18n/ru.ts:5`, `web/src/i18n/en.ts` | satisfied |
| 6.6 | The title is concise | Two syllables, six letters | same | satisfied |
| 6.7 | No useless controls for the declared platforms | The menu offers «Играть», «Как играть», «Настройки» and «Продолжить» only when a saved match exists; there is no "exit game" button | `docs/screens/screens-menu-ru-portrait.png`, `web/src/ui/menu.ts:55-58` | satisfied |
| 6.8 | Tutorial for a complex mechanic | Four how-to pages plus the first-match hint card that walks goal → movement → six → capture | `docs/screens/screens-howto-en-landscape.png`, `docs/screens/screens-hint-landscape.png`, `web/test/progress.test.ts` › "lists unseen hints in teaching order (first-game tutorial)" | satisfied |
| 6.9 | Language switch reachable without knowing the current language | Language names are self-named, but the entry point is a text button labelled in the current language («Настройки»/«Settings»), so a player who cannot read it cannot find the switch | `docs/screens/screens-settings-ru-portrait.png`, `web/src/ui/menu.ts:58` | not satisfied — replace the settings label with a gear glyph (and keep the text as a tooltip); recommended tier only, needs a designer → `@designer` |

## 8. Texts and media

| Item | Demands | How this build satisfies it | Evidence | Status |
|---|---|---|---|---|
| 8.1 | The section applies to every text and medium | Applies to the game strings and the draft; see the rows below | — | satisfied |
| 8.2.1 | Correct spelling and punctuation for the chosen language | ru and en dictionaries written and reviewed for the copy pass; plural forms handled per language | `web/src/i18n/ru.ts`, `web/src/i18n/en.ts`, `web/test/i18n.test.ts` › "declines the Russian turn-count plural (1 / 2-4 / 5+ / 11-14)" | satisfied |
| 8.2.2 | Texts reflect the real mechanic, the title does not mislead | Every how-to page describes what the engine does; the title is the game's own name | `web/src/i18n/ru.ts:66-80`, `web/test/engine/*.test.ts` | satisfied |
| 8.2.3 | Gameplay-relevant texts are translated | Full key parity between ru and en; the guard test fails on a missing or extra key | `web/test/i18n.test.ts` › "carries exactly the same key set in both languages (a missing key fails here)" | satisfied |
| 8.2.4 | No profanity in any language | Checked over the whole string set | `web/src/i18n/ru.ts`, `web/src/i18n/en.ts` | satisfied |
| 8.2.5 | No forbidden material in texts | No political, religious, occult or violent wording | same files | satisfied |
| 8.3.1 | Media quality, no artefacts | Screenshots are the live canvas at 1× DPR, no compression artefacts beyond PNG; the "black" surfaces are the game's own dark wood | `docs/screens/screens-game-ru-portrait.png` | satisfied |
| 8.3.2 | Media reflect the object they illustrate | Screenshots are the states they are named after | `docs/screens/` | satisfied |
| 8.3.3 | No frames or rounded corners on promo media | No promo media produced | — | not satisfied — no icon or cover exists |
| 8.3.4 | No system UI or platform badges in media | The canvas carries no status bar, no badge, no platform rating | `docs/screens/` (all 32) | satisfied |
| 8.3.5 | No sexual or abusive content | None | `web/src/i18n/*.ts`, `docs/art-direction.md` | satisfied |
| 8.3.6 | Safe and ethical for all ages | Porcelain pawns on a wooden table; only abstract conflict | `docs/art-direction.md` §1-12 | satisfied |
| 8.3.7 | No other forbidden materials | None found | same | satisfied |
| 8.4.1 | Links go through the SDK to the developer's own games | No links exist | `grep -rn "https\?://" web/src` → 0 matches | not applicable — no cross-promotion |
| 8.4.2 | No links to external resources, no links inside logos | Nothing in the bundle or the UI links out | same grep; `web/dist/index.html` (no anchors) | satisfied |
| 8.4.3 | Social-community links only under three conditions | No social links | same grep | not applicable — no links |
| 8.4.4 | No automatic or recommended redirects off-platform | No redirect, no "full version" prompt | same grep, `docs/screens/` (32 states) | satisfied |

---

## Manual pass

Everything below needs a human. A phone (Android, Chrome) and a desktop browser are enough for the
first nine steps; M10 needs a TV or an emulated remote, M11 needs a second browser engine, M12 needs
the Yandex test environment with the real SDK.

Record the result next to each step in the PR comment: `ok` or the observed defect.

1. **M1 — launch on each declared platform class.** Open the build on a phone (portrait and landscape),
   a desktop Chrome, a Firefox and an Opera, and Safari on an iPhone. Expect: menu within ~2 s, no
   request to log in, no WebGL message, no scrollbar.
2. **M2 — gestures.** One tap on «Бросить» rolls; one tap on a highlighted cell moves. No drag, no
   double tap, no long press needed anywhere.
3. **M3 — long press and context menu (phone).** Press and hold the board for 3 s: no selection
   highlight, no context menu, no text magnifier. Repeat on desktop with the right mouse button.
4. **M4 — reload mid-game.** Roll, move one pawn, reload the page. Expect a live match with the same
   position, the same dice and the same seat, and «Продолжить» in the menu. Requires the real SDK
   (the local dev server has no storage and will lose the match — that is expected).
5. **M5 — rotation mid-game.** Rotate the phone 90° during a bot turn and back. The same position
   survives, the HUD stays inside the safe area, nothing is cut at the notch.
6. **M6 — muting.** Switch to another app / another tab mid-turn: sound stops at once. Return: sound
   resumes only on the next gesture, never by itself. Repeat with the platform pause (a fullscreen ad
   or the platform's own pause) once monetization exists.
7. **M7 — session without errors.** Open devtools, play a whole match, then rotate, long-press, switch
   tabs, open pause/how-to/settings, finish the match, press «Ещё партия». Expect an empty console
   apart from the SDK's own info lines.
8. **M8 — back navigation.** Open the game from the catalogue, play, press the browser back button.
   Expect a normal exit from the game page, and on return a fresh boot with the match still offered
   through «Продолжить».
9. **M9 — page scroll and swipe-to-refresh.** Pull down from the top of the board on the phone: the
   page must not refresh and must not rubber-band. Scroll wheel on desktop: nothing moves.
10. **M10 — TV.** With a TV remote (or an Android TV emulator): the arrow keys walk «Бросить» → legal
    targets and back; OK rolls and moves; Back closes the top dialog and, with no dialog open, opens
    the pause card. Nothing is cut at the screen edges with 10 % overscan.
11. **M11 — language.** Switch to English in settings, restart: English persists. Then check that the
    how-to and result cards fit in English on the smallest supported phone.
12. **M12 — victory and record.** Finish a match: the victory card names the turn count, «Ещё партия»
    starts a new match, «В меню» returns with no «Продолжить» entry. Reload: the finished match must
    not come back.

## Evidence artefacts

Refreshed in this ticket against `master` @ `2d3b1ab` + the evidence commit (all committed):

- `docs/screens/screens-*.png` — 32 files, 8 states × 2 languages × 2 orientations, regenerated one
  chunk per command (`--workers=1`, `--timeout=180000`; the host wedges a worker after 3–7 chromium
  cycles, so every chunk is a separate invocation). All 16 chunks produced on the first or second
  attempt; nothing was dropped or deleted.
- `docs/screens/screens-hint-portrait.png`, `screens-hint-landscape.png` — new: the first-match hint
  card, captured before any dismissal (no other shot in the battery shows it).
- `docs/screens/tv.png` — 1920×1080 TV capture.
- `docs/screens/grayscale.png` — players remain distinguishable without colour.
- `docs/screens/detail-topleft.png`, `detail-bench-left.png` — 2× crops of the current board.
- `docs/screens/art-audit.json` — regenerated: 0 filters and 0 masks in the render tree, 179 nodes,
  0 canvases created while idle, art payload 216 412 B of the 3 MB budget, p50 250 ms per frame on
  this software renderer (**not** a device number — see `docs/perf-device-checklist.md`).
- `docs/screens/fx-kill-*.png`, `tv-input-after-activation.png`, `landscape.png`, `portrait.png` —
  not stale (they already match the current build; `portrait.png` was checked against
  `screens-game-ru-portrait.png` and is identical).

Bench limits, repeated here because they bound several rows above: **no real phone, no TV remote, no
Yandex environment** on this host. The frame times in `art-audit.json` come from SwiftShader and say
nothing about a device; `docs/perf-device-checklist.md` is the hand-off for M1/M10.
