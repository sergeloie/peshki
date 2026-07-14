package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PlayerTest {

    private GameConfig config;
    private Board board;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
    }

    @Test
    void allPawnsStartOnBench() {
        for (int i = 0; i < config.numberOfPawns(); i++) {
            assertTrue(board.isBench(0, i));
        }
    }

    @Test
    void pawnListHasCorrectSize() {
        assertEquals(config.numberOfPawns(), board.getPawnList(0).size());
    }

    @Test
    void captureMovesPawnToEndOfList() {
        Cell corner0 = board.getCorner(0);
        Cell corner1 = board.getCorner(1);

        // Place enemy pawn on player 0's corner
        board.placePawn(1, 0, corner1);
        Cell targetCell = corner0.getNextFieldCell();
        board.movePawn(1, 0, targetCell);

        // Place player 0's pawn on the field
        board.placePawn(0, 0, corner0);
        board.movePawn(0, 0, corner0.getNextFieldCell());

        // Capture enemy pawn
        board.capturePawn(1, 0);

        // Enemy pawn should be back on bench
        assertTrue(board.isBench(1, 0));
    }

    @Test
    void countHomerPawnsWorks() {
        Cell corner = board.getCorner(0);
        Cell homeCell = corner.getNextHomeCell();

        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, homeCell);

        assertEquals(1, board.countHomerPawns(0));
    }

    @Test
    void getMovablePawnsExcludesBench() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        List<int[]> movable = board.getMovablePawns(0);
        assertEquals(1, movable.size());
        assertEquals(0, movable.get(0)[0]);
    }

    @Test
    void getBenchPawnsExcludesPlaced() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        List<int[]> bench = board.getBenchPawns(0);
        assertEquals(config.numberOfPawns() - 1, bench.size());
    }
}
