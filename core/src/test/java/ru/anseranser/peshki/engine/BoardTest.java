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
        assertEquals(4, board.getPlayers().size());
    }

    @Test
    void eachPlayerHasCorner() {
        for (Player player : board.getPlayers()) {
            assertNotNull(board.getCorner(player));
            assertEquals(Cell.CellType.CORNER, board.getCorner(player).getCellType());
        }
    }

    @Test
    void cornersBelongToCorrectPlayers() {
        for (Player player : board.getPlayers()) {
            assertEquals(player, board.getCorner(player).getOwner());
        }
    }

    @Test
    void fieldCellsFormRing() {
        Player p1 = board.getPlayers().get(0);
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
        for (Player player : board.getPlayers()) {
            Cell corner = board.getCorner(player);
            int homeCount = 0;
            Cell current = corner.getNextHomeCell();
            while (current != null) {
                homeCount++;
                assertEquals(Cell.CellType.HOME, current.getCellType());
                assertEquals(player, current.getOwner());
                current = current.getNextHomeCell();
            }
            assertEquals(config.homeLength(), homeCount);
        }
    }

    @Test
    void homeCellsBranchFromCorners() {
        for (Player player : board.getPlayers()) {
            Cell corner = board.getCorner(player);
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
