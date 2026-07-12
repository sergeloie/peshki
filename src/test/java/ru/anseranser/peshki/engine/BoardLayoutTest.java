package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BoardLayoutTest {

    @Test
    void coordinatesCoverAllCellsAndStayInBounds() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        int[][] coords = BoardLayout.coordinates(engine.getBoard());
        int size = GameConfig.DEFAULT.sideLength();

        assertEquals(engine.getBoard().getAllCells().size(), coords.length);
        for (int[] xy : coords) {
            assertTrue(xy[0] >= 0 && xy[0] < size, "x out of bounds: " + xy[0]);
            assertTrue(xy[1] >= 0 && xy[1] < size, "y out of bounds: " + xy[1]);
        }
    }

    @Test
    void cornersAreAtExpectedPositions() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        int[][] coords = BoardLayout.coordinates(engine.getBoard());
        // Field-ring corners are at allCells indices 0, 7, 14, 21.
        assertArrayEquals(new int[]{0, 0}, coords[0]);
        assertArrayEquals(new int[]{7, 0}, coords[7]);
        assertArrayEquals(new int[]{7, 7}, coords[14]);
        assertArrayEquals(new int[]{0, 7}, coords[21]);
    }

    @Test
    void homeCellsStepInwardFromEachCorner() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        int[][] coords = BoardLayout.coordinates(engine.getBoard());
        // Home cells start at allCells index 28 (player 1) and continue per player.
        // Player 1 home: (1,1),(2,2),(3,3)
        assertArrayEquals(new int[]{1, 1}, coords[28]);
        assertArrayEquals(new int[]{2, 2}, coords[29]);
        assertArrayEquals(new int[]{3, 3}, coords[30]);
        // Player 2 home: (6,1),(5,2),(4,3)
        assertArrayEquals(new int[]{6, 1}, coords[31]);
        assertArrayEquals(new int[]{5, 2}, coords[32]);
        assertArrayEquals(new int[]{4, 3}, coords[33]);
        // Player 3 home: (6,6),(5,5),(4,4)
        assertArrayEquals(new int[]{6, 6}, coords[34]);
        // Player 4 home: (1,6),(2,5),(3,4)
        assertArrayEquals(new int[]{1, 6}, coords[37]);
    }

    @Test
    void gameStateExposesColorAndCellCoordinates() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        GameState state = engine.getState();
        assertEquals(4, state.players().size());
        assertEquals(PlayerColor.RED, state.players().get(0).color());
        assertEquals(PlayerColor.BLUE, state.players().get(3).color());
        assertEquals(engine.getBoard().getAllCells().size(), state.cells().size());
    }
}
