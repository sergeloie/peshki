# Peshki

A Ludo-like board game ("peshki" = "checkers/pawns" in Russian) implemented in
Java 21. The project is being prepared for rework into a mobile/desktop
application, so the codebase is structured around a **UI-agnostic core** that
any front-end (console, Swing, Android, JavaFX, etc.) can drive.

## Build & run

```bash
./gradlew build        # compile + test
./gradlew run          # play in the terminal (console UI)
./gradlew test         # run the test suite
```

On Windows use `gradlew.bat` instead of `./gradlew`.

## Architecture

```
engine/        Pure game rules. NO I/O. (Pawn, Board, GameEngine, GameState, ...)
ai/            Bot strategy (BotStrategy) — depends only on engine types.
controller/    GameSession — UI-agnostic controller wrapping GameEngine,
               emits GameEvent to listeners. This is the boundary every UI uses.
persistence/   GameStateSerializer — JSON (de)serialization of a GameState.
i18n/          Messages — resource-bundle based localisation helper.
ui/console/    Console implementation of InputService / OutputService.
ui/swing/      Minimal reference Swing UI proving the controller boundary.
```

### The core contract

* `GameEngine` owns all rules and produces a `GameState` snapshot
  (`getState()` / `snapshotState()`). It can be restored from a snapshot
  (`restoreState` / `GameEngine.fromState`).
* `GameSession` is what a UI talks to: `rollDice()`, `submitMove(MoveCommand)`,
  `playBotTurn()`, `getState()`, `getAvailableMoves(...)`. It notifies
  registered listeners (`Consumer<GameEvent>`) of every event.
* `GameState` is a plain serializable record — the single thing a view renders
  and the single thing that gets persisted. Views never reach into engine
  internals.

This separation means a new front-end only needs to:
1. Render `GameState`.
2. Translate user input into `MoveCommand` / call `GameSession` methods.
3. Subscribe to `GameEvent`s for feedback.

### Save / load

```java
GameSession session = new GameSession(GameConfig.DEFAULT);
// ... play ...
session.saveToFile(Path.of("save.json"));          // persist
GameSession restored = GameSession.loadFromFile(Path.of("save.json")); // resume
```

### Localisation

All user-facing strings live in `src/main/resources/messages*.properties`
(English default + Russian). Switch locale with `Messages.setLocale(...)`.

## Rules (summary)

* 2–4 players, 4 pawns each. Two dice (1–6); use each die separately or their
  sum; never the same die twice. Rolling a 6 (or any kill) grants an extra turn.
* Pawns travel counter-clockwise around the ring, then up their home column.
* A pawn may land on (and kill) an enemy pawn; it cannot land on its own.
* Win: 3 pawns HOME, and the 4th must land **exactly** on its own corner.

See [`docs/CODE_REVIEW_AND_REWORK_PLAN.md`](docs/CODE_REVIEW_AND_REWORK_PLAN.md)
for the full code-review findings and the remediation plan that produced this
structure.
