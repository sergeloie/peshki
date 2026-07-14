package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class BoardTest {

    private GameConfig config;
    private Board board;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
    }

    @Test
    void createsCorrectNumberOfPlayers() {
        assertEquals(4, board.getCorners().length);
    }

    @Test
    void eachPlayerHasCorner() {
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            assertNotNull(board.getCorner(pi));
            assertEquals(Cell.CellType.CORNER, board.getCorner(pi).getCellType());
        }
    }

    @Test
    void cornersBelongToCorrectPlayers() {
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            assertEquals(pi, board.getCorner(pi).getOwnerPlayerIndex());
        }
    }

    @Test
    void fieldCellsFormRing() {
        int p1 = 0;
        Cell corner = board.getCorner(p1);
        Cell current = corner;

        int count = 0;
        do {
            current = current.getNextFieldCell();
            count++;
        } while (current != corner);

        // Ring includes 4 corners + fieldLength field cells = 28 total nodes
        assertEquals(config.numberOfPlayers() + config.fieldLength(), count);
    }

    @Test
    void homeCellsHaveCorrectCount() {
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            Cell corner = board.getCorner(pi);
            int homeCount = 0;
            Cell current = corner.getNextHomeCell();
            while (current != null) {
                homeCount++;
                assertEquals(Cell.CellType.HOME, current.getCellType());
                assertEquals(pi, current.getOwnerPlayerIndex());
                current = current.getNextHomeCell();
            }
            assertEquals(config.homeLength(), homeCount);
        }
    }

    @Test
    void homeCellsBranchFromCorners() {
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            Cell corner = board.getCorner(pi);
            assertNotNull(corner.getNextHomeCell());
            assertEquals(Cell.CellType.HOME, corner.getNextHomeCell().getCellType());
        }
    }

    @Test
    void allCellsAreUnique() {
        var allCells = board.getAllCells();
        assertEquals(allCells.size(), allCells.stream().distinct().count());
    }
}
