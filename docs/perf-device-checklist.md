# Device performance checklist — web, ticket #9

The bench here is SwiftShader (software GL), so **no device fps claim can come
from it**. Every number below marked “device” must be measured on real
hardware. This checklist is the device-side hand-off for ticket #9; the
bench-side evidence lives in `docs/screens/art-audit.json`.

## 1.Profiles

- Mid-range Android (issue target): Snapdragon 7-series / Dimensity 8000
  class, Chrome stable, ~DPR 2.6 — `resolution` is capped at 2 in
  `createRenderer()` already, so DPR > 2 changes nothing.
- Old Android (floor): Snapdragon 6-series, DPR 2, Chrome ~2 versions old.
- Android TV box (10 % audience): verify the TV keyboard path from the
  remote as well (Arrow keys / Enter / Back).
- Desktop: any discrete/integrated GPU (sanity only).

## 2. Frame budget during a bot turn with effects

1. Open `?screen=game&seed=424242`, let bots play for ~30 s.
2. Chrome DevTools → Performance → record one bot turn.
3. Assert p95 frame **≤ 16 ms**; screenshot each spike and map it to an
   effect (kill burst, dice toss, hand-over ring). Expected per bench
   (`art-audit.json`, software p95): the loop does only position/alpha/scale
   writes and ≤ 2 Graphics redraws (dice pulse, focus ring) — no filters, no
   masks in the animated layers.
4. Idle player turn: DevTools FPS meter pinned at ~60 for a full minute;
   canvas paints at full rate (`app.start()` on visibility).

## 3. Memory

1. DevTools → Performance monitor: GPU memory should stay < ~40 MB
   (texture estimate in `art-audit.json ≈ shared procedural canvases +
   8 pawn bakes`).
2. Play one full game with autosave on; heap deltas should be flat the
   autosave windows don't leak (the effects pool destroys its sprites —
   watch no `Sprite` growth in a heap snapshot after repeated kills).

## 4. Focus/pause discipline (platform 1.6.1.6)

1. Move focus off the window mid-turn: audio gate mutes immediately
   (`setMuted(true)`), renderer keeps running but audio must not sound;
   return and confirm no sound without a new gesture.
2. Trigger the platform pause (`game_api_pause`): gameplay stops and audio
   gates within the SDK requirement window.
3. Background the tab (`visibilitychange`): renderer stops
   (`app.stop()`), pending autosave flushes.

## 5. Adaptive layouts on device

1. Rotate 390×844 → 844×390 in mobile devtools and on a real phone; check
   HUD insets over the actual notches (`safe-area` probe).
2. TV overscan: set Android TV display to ~10 % overscan, verify roll
   button and side panel still reachable (24 px minimum margins).
3. Row of checks from the layout matrix unit test (`web/test/layout.test.ts`)
   reproduced in devtools at the 10 viewport sizes listed there.

## 6. Not verifiable on the bench (carry over)

- Real-device 60 fps (p50/p95) — GPU-bound numbers only on the profiles above.
- Real audio output — latency, HAL behaviour, BT headset switching.
- A real TV remote (its Enter/Back keycodes are only emulated here).
- A recorded full playthrough — the recording device doubles as bench;
  screens exist per state instead (`fx-kill-*.png`, `tv-input-*.png`).
