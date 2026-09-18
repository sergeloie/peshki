package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Ticket 05: progress metric ordering + display-number assignment.
 */
class PawnProgressTest {

    private GameConfig config;
    private Board board;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
    }

    @Test
    void benchAndNewbornSortLowest() {
        assertEquals(-2, board.pawnProgress(0, 0));
        board.placePawn(0, 0, board.getCorner(0));
        assertEquals(-1, board.pawnProgress(0, 0));
    }

    @Test
    void furtherAlongRingMeansHigherProgress() {
        Cell corner = board.getCorner(0);
        Cell cell1 = corner.getNextFieldCell();
        Cell cell2 = cell1.getNextFieldCell();

        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, cell1);
        board.placePawn(0, 1, corner);
        board.movePawn(0, 1, cell2);

        assertTrue(board.pawnProgress(0, 1) > board.pawnProgress(0, 0));
    }

    @Test
    void fielderOnOwnCornerHasMaxFieldProgress() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, corner.getNextFieldCell());
        board.movePawn(0, 0, corner);

        assertEquals(board.getTopology().ringSize() - 1, board.pawnProgress(0, 0));
    }

    @Test
    void homerOutranksAnyFielder() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, corner.getNextFieldCell());
        board.placePawn(0, 1, corner);
        board.movePawn(0, 1, corner.getNextHomeCell());

        assertTrue(board.pawnProgress(0, 1) >= 1000);
        assertTrue(board.pawnProgress(0, 1) > board.pawnProgress(0, 0));
    }

    @Test
    void displayNumbersRankByProgressWithStableTies() {
        GameEngine engine = new GameEngine(config);
        GameState.PlayerState player = engine.getState().players().get(0);

        Map<Integer, Integer> numbers = DisplayNumbers.assign(player.pawns());

        // Fresh game: all bench, progress -2, ties -> lowest index is #1.
        assertEquals(1, numbers.get(0));
        assertEquals(4, numbers.get(3));
    }
}
