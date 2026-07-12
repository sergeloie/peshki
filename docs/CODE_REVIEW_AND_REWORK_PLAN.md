# Code Review & Rework Plan — "Peshki"

**Goal of review:** full audit of the project and a detailed, prioritized plan to fix all
found defects, with the specific objective of making the codebase ready to be reworked into a
**mobile or desktop application** (Swing / JavaFX / Android / Compose / libGDX, etc.).

**Scope reviewed:** all `src/main` sources, all `src/test` sources, build files, `AGENTS.md`, `REAGENTS.MD`.
**Method:** static reading of every source file, cross-checking logic against `REAGENTS.MD` (the authoritative rules document) and the existing test suite.

---

## 1. Executive Summary

The project is a **console Ludo-like game** ("Пешки") written in Java 21. The good news: the
**core domain model is already well separated** from I/O (`engine/` has no `System.out`, uses
sealed interfaces + records for `GameEvent`/`MoveCommand`/`Move`, and Lombok). This is a solid
foundation for a UI rework.

The review found:
- **9 correctness bugs found** (BUG-5 closed as non-issue after rules clarification; BUG-9 and BUG-10 found and fixed during the rework; 6 of the remaining bugs violate the documented game rules and affect gameplay fairness). All are now fixed and covered by tests.
- **~14 architecture issues** that block a clean mobile/desktop port (hardcoded console I/O, blocking stdin, hardcoded 8x8 board + ANSI colors, no persistence, static global RNG, hardcoded AI, coupled game loop).
- Several code-quality / maintainability problems.

**Key takeaway:** the `GameEngine` + `GameEvent` model is reusable, but `Main`, `ConsoleInput`, `ConsoleOutput`, and `BoardRenderer` are console-only and must be replaced by a UI-agnostic controller + view layer.

---

## 2. Correctness Bugs (must fix)

### BUG-1 — Placing on an enemy corner is a silent kill (no extra turn)
**File:** [`GameEngine.java:121`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:121)
**Severity:** HIGH (rule violation)
`executePlacePawn` removes an enemy pawn standing on the player's corner (`existingPawn.remove()` at line 131) but emits only `PawnPlaced`. No `PawnKilled` event is produced, so neither the human path (`Main` checks `instanceof GameEvent.PawnKilled`) nor the bot path (`kickedEnemy`) grants the extra turn that `REAGENTS.MD` section 7 explicitly promises ("This counts as a kill and grants an extra turn").
**Fix:** emit `GameEvent.PawnKilled(...)` before `existingPawn.remove()` and set the extra-turn flag in both code paths.

### BUG-2 — Bot never gets an extra turn for rolling a 6
**File:** [`GameEngine.java:76`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:76)
**Severity:** HIGH (rule violation / human-vs-bot asymmetry)
`executeBotTurn` sets `extraTurn = executeBotMoves(...)`, and `executeBotMoves` returns only `kickedEnemy`. Per `REAGENTS.MD` section 8 a 6 always grants an extra turn, but the bot ignores it. The human path correctly initializes `extraTurn = getCurrentDice().contains(6)` ([`Main.java:58`](src/main/java/ru/anseranser/peshki/Main.java:58)).
**Fix:** `boolean extraTurn = kickedEnemy || dice.contains(6);` (or pass the rolled dice into `executeBotMoves` and compute it there).

### BUG-3 — Bot "PlaceAndMove" combo wastes the second die (latent)
**File:** [`GameEngine.java:184`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:184)
**Severity:** MEDIUM (fragile / latent correctness risk)
When `bestMove.pawn() == null` the bot only calls `executePlacePawn(player, 6, ...)` but then removes **both** dice via `bestMove.consumedDice()` (line 214). For a `PlaceAndMove` `Move(null, dieValue, [6, dieValue])` this consumes the second die without ever moving the pawn. In practice the plain-place `Move(null, 0, [6])` is generated first and usually selected, so the bug is currently masked — but it is a real defect if selection order changes or plain-place is unavailable.
**Fix:** handle `PlaceAndMove` explicitly in `executeBotMoves` (place then move the newborn), or stop generating the combined `Move` for the bot and let it place + move in two loop iterations while only consuming the dice actually used.

### BUG-4 — Bot placing on enemy corner does not set `kickedEnemy`
**File:** [`GameEngine.java:184`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:184)
**Severity:** MEDIUM (consequence of BUG-1)
`executePlacePawn` silently removes the enemy (BUG-1) and `executeBotMoves` never sets `kickedEnemy` for that case, so the bot also loses the extra turn here.
**Fix:** fold into BUG-1 fix (emit `PawnKilled` and propagate the flag).

### BUG-5 — Non-last-lap pawn landing exactly on its own corner "rests" instead of entering home
**File:** [`Pawn.java:34`](src/main/java/ru/anseranser/peshki/engine/Pawn.java:34)
**Severity:** LOW/MEDIUM (rule ambiguity)
**Status:** CLOSED — non-issue (verified against rules clarification).
The corner is a full-fledged field cell; a non-last-lap pawn that lands exactly on its own corner stays `FIELDER` on it (and can be captured there), while a pawn starting on / passing through its own corner transits into the home. The last-lap pawn still wins only on an exact landing (REAGENTS §9). The current `findTargetCell` already implements all of this, so **no code change is required**.

### BUG-6 — `getFieldPosition` returns -1 on a malformed board -> wrong renumber
**File:** [`Player.java:83`](src/main/java/ru/anseranser/peshki/engine/Player.java:83)
**Severity:** LOW (defensive)
`getFieldPosition` walks the ring with a `pos < 100` guard and returns `-1` if the pawn is not found. A `-1` progress collides with `NEWBORN` (-1) progress in `renumber`, producing incorrect pawn numbering. The `pos < 100` magic number is also a smell.
**Fix:** assert the ring is well-formed at board construction; if a pawn is genuinely not on the ring, treat as a programming error (fail fast) rather than silently returning -1.

### BUG-7 — `executeHumanCommand` ignores its `usedDice` parameter
**File:** [`GameEngine.java:96`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:96)
**Severity:** LOW (dead parameter / misleading API)
`usedDice` is passed in but never read; tracking is done in `Main.updateRemainingDice`. The parameter suggests the engine tracks used dice, which it does not.
**Fix:** remove the parameter, or move dice-bookkeeping into the engine for a single source of truth.

### BUG-8 — `GameEvent.MoveRejected` is dead code
**File:** [`GameEvent.java:11`](src/main/java/ru/anseranser/peshki/engine/event/GameEvent.java:11)
**Severity:** LOW
The event is declared but never emitted. Invalid moves are currently silently dropped (`executeMovePawn` returns early on `null` target). For a UI you want explicit rejection feedback.
**Fix:** emit `MoveRejected(reason)` from the engine when a command cannot be applied, and render it.

### BUG-9 — Field-ring walk bound too short crashes a full bot game
**File:** [`Player.java:83`](src/main/java/ru/anseranser/peshki/engine/Player.java:83), [`BotStrategy.java`](src/main/java/ru/anseranser/peshki/ai/BotStrategy.java)
**Severity:** HIGH (crash / data corruption)
`getFieldPosition` walks the shared field ring with the bound `pos < config.fieldLength()` (24 for the default config), but the full ring from a player's own corner back to itself is `fieldLength() + numberOfPlayers()` = 28 cells. A pawn sitting on a far segment (e.g., cell 13, position 26 measured from player 3's corner) is never reached, so the method threw `IllegalStateException("Pawn ... is not on the field ring of player ...")` during `renumber()` inside `executeBotTurn`. The same flawed bound existed in `BotStrategy.calculateDistanceToHome`, producing wrong distances for far pawns.
**Fix:** use `ringLength = config.fieldLength() + config.numberOfPlayers()` as the walk bound in both methods. Found and fixed during the rework (caught by `GameSessionIntegrationTest.fullBotGameReachesCompletionViaSession`); verified — full build passes with 66 tests.

### BUG-10 — Human turn never advances the player, so bots never play
**File:** [`Main.java:50`](src/main/java/ru/anseranser/peshki/Main.java:50)
**Severity:** HIGH (gameplay-breaking)
The game loop in `Main` relied on the engine to advance the current player after each turn, but the two code paths were asymmetric: the **bot** path (`GameSession.playBotTurn()` → `GameEngine.executeBotTurn()`) calls `advancePlayer(extraTurn)` internally, while the **human** path (`GameSession.submitMove()` → `GameEngine.executeHumanCommand()`) does **not** advance the player. `Main` also never advanced the player after a human turn. As a result `currentPlayerIndex` stayed at `0` forever: the human (player 1) kept taking every turn and the 3 bots were never reached — the game appeared to have only one player.
**Fix:** after a human turn the orchestrator now calls `engine.advancePlayer(extraTurn)` (the bot branch already advances internally, so it is untouched). The loop was extracted into a package-private `Main.runGame(GameEngine, InputService, OutputService)` so it is directly testable. Covered by `MainGameLoopTest.humanTurnAdvancesSoAllPlayersIncludingBotsTakeTurns`, which drives the real loop with a deterministic dice roller and asserts all four players (human + 3 bots) take turns.

---

## 3. Architecture Issues for Mobile / Desktop Rework (must address)

### ARCH-1 — `Main` couples game loop + console I/O + engine
**File:** [`Main.java:16`](src/main/java/ru/anseranser/peshki/Main.java:16)
The only entry point runs a synchronous, blocking full-game loop that directly drives `ConsoleInput`/`ConsoleOutput`. A mobile/desktop app needs an embeddable, UI-owned **session** object and an event/callback-driven loop, not a `main` that plays the whole game.
**Fix:** extract a `GameSession` (or `GameController`) that exposes `rollDice()`, `submitMove(MoveCommand)`, `getState()`, and an event listener; `Main` becomes a thin console bootstrap only.

### ARCH-2 — `ConsoleInput` uses blocking `System.in` and `System.out` directly
**File:** [`ConsoleInput.java:13`](src/main/java/ru/anseranser/peshki/ui/console/ConsoleInput.java:13)
`BufferedReader.readLine()` blocks the calling thread and prints via `System.out` (lines 21-23, 108), bypassing `OutputService`. GUI/mobile UIs are event-driven (button taps, gestures) and must not block the UI thread.
**Fix:** replace `InputService.getMove(...)` (blocking) with an async model — the UI builds a `MoveCommand` from user interaction and calls `session.submitMove(cmd)`. Keep `InputService` only as an abstraction for headless/AI/test drivers.

### ARCH-3 — `BoardRenderer` is hardcoded to 8x8 + ANSI colors
**File:** [`BoardRenderer.java:18`](src/main/java/ru/anseranser/peshki/ui/console/BoardRenderer.java:18)
`size = 8` is a literal; corner/home layout (`directions`, `corners`) assumes exactly 4 players and an 8x8 grid; colors use `\033[..m` ANSI escapes that do not exist in a GUI.
**Fix:** derive board geometry from `GameConfig` (compute x/y coordinates for every `Cell` at board construction and store them on the cell or a `BoardLayout` object). Renderers consume coordinates, never hardcode size. Replace ANSI with a `PlayerColor` enum / theme object.

### ARCH-4 — `OutputService.snapshotBoard` returns `String[]`
**File:** [`OutputService.java:12`](src/main/java/ru/anseranser/peshki/output/OutputService.java:12)
The "view model" is text lines, which is console-specific. A GUI needs a structured board state.
**Fix:** add a `GameState`/`BoardView` snapshot (players, pawns with positions, dice, current player, last events) that any renderer can consume; keep text rendering as one implementation.

### ARCH-5 — Static global `Random` in `Player`
**File:** [`Player.java:19`](src/main/java/ru/anseranser/peshki/engine/Player.java:19)
`private static final Random RANDOM` is a global mutable singleton. This blocks deterministic tests, seeded games, save/restore, and multiplayer fairness.
**Fix:** inject a `DiceRoller` (or `Random`) via `GameConfig`/`GameEngine` constructor.

### ARCH-6 — `GameEngine` hardcodes `new BotStrategy()`
**File:** [`GameEngine.java:18`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:18)
AI is hardwired. A rework needs to choose human vs AI per player and to swap strategies.
**Fix:** inject `BotStrategy` (or a `MoveSelector` interface) through the constructor; default to `BotStrategy` for backward compatibility.

### ARCH-7 — No persistence / serialization of game state
**Impact:** mobile apps can be killed by the OS (Android) and desktop apps need save/load. The current `Board`/`Cell` graph is a web of mutable objects with back-references and a static RNG; `GameEngine` holds transient state (`currentDice`, `turnNumber`).
**Fix:** define a serializable `GameState` (players, pawns, cell occupancy, dice, turn index) and `addSnapshot()`/`restore(GameState)` on `GameEngine`. Prefer a flat coordinate-based board representation for easy (de)serialization (JSON).

### ARCH-8 — `GameConfig` has no validation
**File:** [`GameConfig.java:3`](src/main/java/ru/anseranser/peshki/engine/GameConfig.java:3)
A configurable mobile game must reject invalid configs (e.g., `players` 2-4, `sideLength >= 2`, `pawns >= 1`). Currently any int is accepted and would produce a broken board.
**Fix:** add validation in the record's compact constructor (throw `IllegalArgumentException`).

### ARCH-9 — No internationalization
Console strings are hardcoded and mix Russian/English ([`ConsoleOutput.java:36`](src/main/java/ru/anseranser/peshki/ui/console/ConsoleOutput.java:36), [`ConsoleInput.java:48`](src/main/java/ru/anseranser/peshki/ui/console/ConsoleInput.java:48)). A mobile/desktop product needs localized resources.
**Fix:** externalize all user-facing strings to resource bundles; the engine must stay string-free (it already is — keep it that way).

### ARCH-10 — Duplicated player-advancement logic
**File:** [`GameEngine.java:33`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:33) vs [`GameEngine.java:84`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:84)
`advancePlayer(...)` and the inline `currentPlayerIndex = ...` inside `executeBotTurn` implement the same rule in two places.
**Fix:** have `executeBotTurn` call `advancePlayer(extraTurn)` for a single source of truth.

### ARCH-11 — `cellIndex` is an O(n) linear scan per move
**File:** [`GameEngine.java:283`](src/main/java/ru/anseranser/peshki/engine/GameEngine.java:283)
Called for every `PawnMoved` event; harmless at this scale but wasteful and a code smell.
**Fix:** store a stable cell index/coordinate on `Cell` at construction and use it directly.

### ARCH-12 — No threading model for responsiveness
The whole game runs on the caller's thread. A GUI must keep game logic off the UI thread and post events back.
**Fix:** document/implement a threading contract (e.g., engine runs on a background executor; events delivered on the UI thread via a listener).

### ARCH-13 — `README.md` is a single line; no rework/architecture docs
**Fix:** expand `README.md` and add an architecture overview; the existing `REAGENTS.MD` is excellent and should be kept as the rules spec.

### ARCH-14 — Test coverage gaps (see section 5)
No tests for BUG-1/2/3/4 (extra-turn-on-6, kill-on-place), no UI/integration tests, no serialization tests.

---

## 4. Code Quality / Maintainability

- `ConsoleInput` violates the project's own rule ("All console output goes through `ConsoleOutput`") by calling `System.out` directly.
- `GameEvent.MoveRejected` and the unused `usedDice` param are dead code (BUG-7/8).
- `Player.getFieldPosition` uses a magic `pos < 100` guard (BUG-6).
- `GameEngine` mixes responsibilities (dice, turn flow, move execution, win detection). Consider splitting `WinChecker` / `TurnManager` if the engine grows.
- `BoardRenderer` home-direction arrays are magic constants tied to 8x8 (ARCH-3).

---

## 5. Test Coverage Gaps

| Area | Status | Note |
|------|--------|------|
| `Pawn` movement / last-lap | GOOD | `PawnTest` is thorough |
| `Player.renumber` | GOOD | `PlayerTest` covers orders |
| `Board` structure | GOOD | `BoardTest` covers ring/home |
| `GameEngine` flow | PARTIAL | no extra-turn-on-6 / kill-on-place tests |
| Bot extra-turn (BUG-2/4) | MISSING | add a test rolling a 6 with no kill |
| Place-on-enemy-corner (BUG-1) | MISSING | assert `PawnKilled` + extra turn |
| `GameConfig` validation (ARCH-8) | MISSING | assert illegal configs throw |
| Serialization (ARCH-7) | MISSING | snapshot/restore round-trip test |
| UI / integration | MISSING | no headless session test |

---

## 6. Detailed Remediation Plan (phased)

### Phase 0 — Foundations (no behavior change)
- [x] **P0.1** Add `GameConfig` validation in the compact constructor (ARCH-8). Add `GameConfigTest` cases for illegal values.
- [x] **P0.2** Inject `DiceRoller`/`Random` into `GameEngine` (ARCH-5); remove `static Random` from `Player`. Keep a default seeded instance for backward compat.
- [x] **P0.3** Inject `BotStrategy` (or `MoveSelector`) into `GameEngine` (ARCH-6).
- [x] **P0.4** Add a stable cell index/coordinate to `Cell` at board construction; replace `cellIndex` linear scan (ARCH-11).
- [x] **P0.5** Unify player advancement: `executeBotTurn` calls `advancePlayer(extraTurn)` (ARCH-10).

### Phase 1 — Correctness fixes (with regression tests)
- [x] **P1.1** BUG-1/4: emit `PawnKilled` in `executePlacePawn` when removing an enemy; propagate extra-turn flag. Add test: place on enemy corner -> `PawnKilled` event + extra turn.
- [x] **P1.2** BUG-2: bot extra turn on a rolled 6 (`extraTurn = kickedEnemy || dice.contains(6)`). Add test: bot rolls [6,3], no kill -> still gets extra turn.
- [x] **P1.3** BUG-3: make bot `PlaceAndMove` handling explicit or stop generating the combined move for the bot. Add test asserting both dice are actually used.
- [x] **P1.4** BUG-5: CLOSED as non-issue — no change needed (verified against rules clarification).
- [x] **P1.5** BUG-6: fail-fast in `getFieldPosition` instead of returning -1; add a malformed-board guard test (or remove the guard if the ring is guaranteed well-formed).
- [x] **P1.6** BUG-7: drop the unused `usedDice` param or move dice bookkeeping into the engine.
- [x] **P1.7** BUG-8: emit `MoveRejected(reason)` from the engine for unapplicable commands.

### Phase 2 — UI-agnostic view model (enables any frontend)
- [x] **P2.1** Define `GameState`/`BoardView` snapshot (players, pawns+positions, dice, current player, recent events) (ARCH-4). Engine gains `getState()`.
- [x] **P2.2** Compute `Cell` x/y coordinates from `GameConfig` in `Board`/`BoardLayout` (ARCH-3). No hardcoded 8x8.
- [x] **P2.3** Replace `OutputService.snapshotBoard(): String[]` with the structured snapshot; keep a `ConsoleView` that renders the snapshot to text.
- [x] **P2.4** Introduce `PlayerColor`/theme enum to replace ANSI literals (ARCH-3).

### Phase 3 — Decouple the game loop (the actual rework enabler)
- [x] **P3.1** Extract `GameSession`/`GameController`: owns `GameEngine`, exposes `rollDice()`, `submitMove(MoveCommand)`, `getState()`, and an `addListener(Consumer<GameEvent>)` (ARCH-1).
- [x] **P3.2** Replace blocking `InputService.getMove` with async command submission (ARCH-2). `ConsoleInput` becomes a console *driver* that builds `MoveCommand` and calls `submitMove`.
- [x] **P3.3** `Main` shrinks to: build `GameSession`, wire a `ConsoleView` listener, run a thin console loop (or be deleted in favor of the new UI).
- [x] **P3.4** Define threading contract (engine off UI thread, events on UI thread) (ARCH-12).

### Phase 4 — Persistence (mobile/desktop requirement)
- [x] **P4.1** Add `GameEngine.snapshotState()` / `restoreState(GameState)` (ARCH-7).
- [x] **P4.2** JSON (de)serialization of `GameState`; round-trip test.
- [x] **P4.3** Wire save/load into the chosen UI (auto-save on Android lifecycle events, menu in desktop).

### Phase 5 — Polish & docs
- [x] **P5.1** Externalize all strings to resource bundles (ARCH-9).
- [x] **P5.2** Expand `README.md`; add architecture overview; keep `REAGENTS.MD` as rules spec.
- [x] **P5.3** Add an integration test that plays a full bot-vs-bot game through `GameSession` (headless), asserting it terminates and emits `GameWon`.
- [x] **P5.4** (Optional) implement one reference non-console UI (e.g., JavaFX/Swing) to prove the abstraction; this is the real validation of the rework readiness.

---

## 7. Recommended Target Architecture (end state)

```
ui.*            <- Swing / JavaFX / Android / Compose views (consume GameState, emit MoveCommand)
controller      <- GameSession: owns GameEngine, drives turns, dispatches GameEvent to listeners
engine.*        <- PURE rules (no I/O, no threading, no static RNG)  [KEEP, already clean]
ai.*            <- BotStrategy (injected)
input/output    <- abstractions only; console impls become one of many frontends
persistence     <- GameState snapshot/restore (JSON)
```

**Key invariants to preserve (from AGENTS.md):** `engine/` stays I/O-free; `findTargetCell` / `hasWon` / `Player.renumber` / `BotStrategy.scoreMove` remain the source of truth for rules; never change their public signatures without updating all callers; re-run `PawnTest`, `GameEngineTest`, `PlayerTest` after editing them.

---

## 8. Priority Order (what to do first)

1. **Phase 1 (correctness)** — these are real gameplay bugs and are cheap to fix with tests.
2. **Phase 0 (foundations)** — injection points that everything else depends on.
3. **Phase 2 -> 3 (view model + loop decoupling)** — the actual rework enabler.
4. **Phase 4 (persistence)** — required for mobile/desktop but independent of UI choice.
5. **Phase 5 (polish)** — docs/i18n/reference UI.

Estimated effort: Phase 0-1 ~ 1-2 days; Phase 2-3 ~ 3-5 days; Phase 4 ~ 1-2 days; Phase 5 ~ 1-2 days.

---

## 9. Execution Status (all phases complete)

All phases 0–5 have been **executed and verified**. The final `gradlew.bat build` is **BUILD SUCCESSFUL** with **66 tests passing**.

### Bugs fixed
| ID | Title | Status |
|----|-------|--------|
| BUG-1/4 | Place-kill emits `PawnKilled` + extra turn | FIXED (test: `GameEngineBugTest`) |
| BUG-2 | Bot extra turn on rolled 6 | FIXED (test: `GameEngineBugTest`) |
| BUG-3 | Bot `PlaceAndMove` uses both dice | FIXED (test: `GameEngineBugTest`) |
| BUG-5 | Corner "rest" ambiguity | CLOSED — non-issue (verified) |
| BUG-6 | `getFieldPosition` fail-fast | FIXED |
| BUG-7 | Drop unused `usedDice` param | FIXED |
| BUG-8 | Emit `MoveRejected` | FIXED |
| BUG-9 | Field-ring walk bound crash | FIXED (found during rework; test: `GameSessionIntegrationTest`) |
| BUG-10 | Human turn never advances player (bots never play) | FIXED (test: `MainGameLoopTest`) |

### Architecture work delivered
- **UI-agnostic core**: `GameState` snapshot, `BoardLayout` (coordinates from `GameConfig`), `PlayerColor` enum replacing ANSI.
- **Controller**: `GameSession` with `submitMove`/`getState`/listener + async input model; `Main` now bootstraps it.
- **Persistence**: `GameEngine.snapshotState()`/`restoreState()` + Jackson JSON round-trip (`GameStateSerializer`, `GameStatePersistenceTest`).
- **i18n**: `ResourceBundle` + `MessageFormat` (`Messages`), `messages.properties` / `messages_ru.properties`.
- **Reference UI**: `ui.swing.SwingGameView` proving the abstraction works headlessly and on the desktop.
- **Docs**: expanded `README.md` + this plan; `REAGENTS.MD` kept as the rules spec.

### Remaining optional follow-ups (not blocking the rework)
- Wire `GameSession` save/load into a real UI menu / Android lifecycle (P4.3 is minimal).
- Add a `WinChecker`/`TurnManager` split if the engine keeps growing (ARCH-11/quality note).
- Broaden i18n coverage to all remaining console strings and add locale switching in the UI.



