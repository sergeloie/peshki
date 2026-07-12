package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GameConfigTest {

    @Test
    void defaultConfigValues() {
        GameConfig config = GameConfig.DEFAULT;
        assertEquals(8, config.sideLength());
        assertEquals(4, config.numberOfPlayers());
        assertEquals(4, config.numberOfPawns());
        assertEquals(2, config.numberOfDice());
        assertEquals(6, config.numberOfSidesOnDice());
        assertEquals(5000, config.maxTurns());
    }

    @Test
    void fieldLengthCalculation() {
        GameConfig config = GameConfig.DEFAULT;
        assertEquals(24, config.fieldLength());
    }

    @Test
    void homeLengthCalculation() {
        GameConfig config = GameConfig.DEFAULT;
        assertEquals(3, config.homeLength());
    }

    @Test
    void rejectsInvalidSideLength() {
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(1, 4, 4, 2, 6, 5000));
    }

    @Test
    void rejectsInvalidPlayerCount() {
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(8, 1, 4, 2, 6, 5000));
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(8, 5, 4, 2, 6, 5000));
    }

    @Test
    void rejectsInvalidPawnCount() {
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(8, 4, 0, 2, 6, 5000));
    }

    @Test
    void rejectsInvalidDiceCount() {
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(8, 4, 4, 0, 6, 5000));
    }

    @Test
    void rejectsInvalidSides() {
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(8, 4, 4, 2, 0, 5000));
    }

    @Test
    void rejectsInvalidMaxTurns() {
        assertThrows(IllegalArgumentException.class,
                () -> new GameConfig(8, 4, 4, 2, 6, 0));
    }
}
