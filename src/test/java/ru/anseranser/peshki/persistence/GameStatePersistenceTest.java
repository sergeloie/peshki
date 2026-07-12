package ru.anseranser.peshki.persistence;

import org.junit.jupiter.api.Test;

import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;

class GameStatePersistenceTest {

    @Test
    void jsonRoundTripPreservesState() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        // Advance the game a few turns so the snapshot is non-trivial.
        for (int i = 0; i < 5; i++) {
            engine.rollDice();
            engine.executeBotTurn();
        }

        GameState original = engine.snapshotState();
        String json = GameStateSerializer.toJson(original);
        GameState restored = GameStateSerializer.fromJson(json);

        assertEquals(original, restored, "Deserialized state must equal the original snapshot");
    }

    @Test
    void fromStateRebuildsEquivalentEngine() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        for (int i = 0; i < 8; i++) {
            engine.rollDice();
            engine.executeBotTurn();
        }

        GameState snapshot = engine.snapshotState();
        GameEngine restored = GameEngine.fromState(GameStateSerializer.fromJson(
                GameStateSerializer.toJson(snapshot)));

        assertNotSame(engine, restored);
        assertEquals(snapshot, restored.snapshotState(),
                "Engine rebuilt from JSON must produce an identical snapshot");
    }
}
