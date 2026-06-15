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
}
