package ru.anseranser.peshki.persistence;

import org.junit.jupiter.api.Test;

import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Golden test for save format (ticket 02). If the JSON shape changes
 * (e.g. when view coordinates leave the domain in ticket 09),
 * this test must be updated deliberately — never silently.
 */
class GameStateGoldenTest {

    @Test
    void jsonShapeIsStableAndRoundTrips() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        for (int i = 0; i < 3; i++) {
            engine.rollDice();
            engine.executeBotTurn();
        }

        GameState state = engine.snapshotState();
        String json = GameStateSerializer.toJson(state);

        for (String key : new String[]{
                "currentPlayerIndex", "currentDice", "turnNumber",
                "gameOver", "winnerPlayerIndex", "players", "cells", "config",
                "progress"}) {
            assertTrue(json.contains("\"" + key + "\""),
                    "JSON must contain key: " + key);
        }

        assertEquals(state, GameStateSerializer.fromJson(json),
                "Deserialized state must equal the original snapshot");
    }
}
