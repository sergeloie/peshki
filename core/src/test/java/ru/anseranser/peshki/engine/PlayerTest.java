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
    void captureKeepsPawnIndexesStable() {
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

        // Enemy pawn should be back on bench, other indexes untouched
        assertTrue(board.isBench(1, 0));
        assertEquals(config.numberOfPawns(), board.getPawnList(1).size());
    }

    @Test
    void captureDoesNotReassignSurvivingPawns() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, corner.getNextFieldCell());
        board.placePawn(0, 1, corner);
        board.movePawn(0, 1, corner.getNextFieldCell().getNextFieldCell());

        Pawn survivorBefore = board.getPawn(0, 1);
        int survivorCellBefore = board.getPawnCell(0, 1);

        board.capturePawn(0, 0);

        assertSame(survivorBefore, board.getPawn(0, 1),
                "Pawn indexes must be stable across captures");
        assertEquals(survivorCellBefore, board.getPawnCell(0, 1));
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

        List<PawnId> movable = board.getMovablePawns(0);
        assertEquals(1, movable.size());
        assertEquals(0, movable.get(0).pawnIndex());
    }

    @Test
    void getBenchPawnsExcludesPlaced() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        List<PawnId> bench = board.getBenchPawns(0);
        assertEquals(config.numberOfPawns() - 1, bench.size());
    }
}
