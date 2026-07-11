# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack & Build

- Java 21, Gradle (Kotlin DSL `build.gradle.kts`), Lombok via `io.freefair.lombok` plugin (no manual delombok).
- Tests: JUnit 5 (Jupiter), run with `useJUnitPlatform()`.
- Build/run (use `gradlew.bat` on Windows):
  - `./gradlew build` — compile + test
  - `./gradlew run` — launch console game (`ru.anseranser.peshki.Main`)
  - `./gradlew test` — all tests
  - Single class: `./gradlew test --tests "ru.anseranser.peshki.engine.PawnTest"`
  - Single method: `./gradlew test --tests "ru.anseranser.peshki.engine.PawnTest.lastLapPawnWinsWithExactSteps"`

## Code Style (discovered, not enforced by a linter)

- Package root: `ru.anseranser.peshki`. Subpackages: `engine` (pure logic), `ai`, `input`, `output`, `ui.console`, `engine.event`.
- Prefer Java 21 features: **sealed interfaces** with `record` implementations (`MoveCommand`, `GameEvent`), **records** for value types (`GameConfig`, `Move`), **switch expressions** (`switch (cmd) { case X x -> ... }`).
- Use Lombok `@Getter`/`@Setter`/`@EqualsAndHashCode` on model classes (`Pawn`, `Cell`, `Player`). `Player` is `@EqualsAndHashCode(of = "number")` — identity is by number, not field contents.
- Tests use static imports: `import static org.junit.jupiter.api.Assertions.*;`.
- `GameConfig` is a record with a `DEFAULT` constant `(sideLength=8, players=4, pawns=4, dice=2, sides=6, maxTurns=5000)`. `fieldLength() = players*(sideLength-2)`, `homeLength() = pawns-1`. Pass it as a parameter; never hardcode these numbers.

## Architecture

- `engine/` is pure game logic with **no I/O** — no `System.out`, no dependency on `InputService`/`OutputService`. All console output goes through `ConsoleOutput implements OutputService`.
- Flow: `Main` orchestrates `GameEngine` + `InputService`/`OutputService`. Engine emits `GameEvent` records (consumed by output, not printed directly).
- Key invariants live in: `Pawn.findTargetCell()` (movement + win check), `GameEngine.hasWon()` (last pawn must land exactly on its corner), `Player.renumber()` (recompute pawn numbers by progress after every move), `BotStrategy.scoreMove()`.

## Game-Rule Invariants (non-obvious, easy to break)

- Ring: 4 corners + 24 field cells (6 between corners). Movement is **counter-clockwise** via `nextFieldCell`; home is a linear tail via `nextHomeCell`.
- Dice: 2 dice (1-6); may use each die separately or their sum; never the same die twice. A 6 (or any kill) grants an extra turn.
- Cannot jump over any pawn on intermediate cells; cannot land on own pawn at the final cell; can land on (and kill) an enemy pawn.
- **Last-pawn win rule:** when 3 pawns are HOMER, the 4th must land **exactly** on its own corner. Overshooting the corner returns `null` from `findTargetCell` (no fly-over). `i == steps-1` check at the corner enforces this.
- Pawn numbering: #1 = closest to finish, #4 = farthest. Progress order: `HOMER (1000+pos) > FIELDER (0-23) > NEWBORN (-1) > BENCH (-2)`. `renumber()` must be re-run after any pawn leaves the field.
- `Pawn.remove()` throws `IllegalStateException` if state is HOMER or BENCH.

## Change Checklist

1. Read this file first.
2. After editing `findTargetCell`/`hasWon`, run the win/last-lap tests (`PawnTest.lastLapPawnWinsWithExactSteps`, `GameEngineTest`).
3. After editing `renumber`, run `PlayerTest`.
4. Do not change public method signatures in `engine/` without updating all callers; do not delete classes/methods without checking usages.
