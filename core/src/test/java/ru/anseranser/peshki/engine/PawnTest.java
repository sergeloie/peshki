package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PawnTest {

    private GameConfig config;
    private Board board;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
    }

    @Test
    void pawnStartsOnBench() {
        assertTrue(board.isBench(0, 0));
        assertEquals(Pawn.State.BENCH, board.deriveState(0, 0));
    }

    @Test
    void pawnCanBePlacedOnCorner() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        assertFalse(board.isBench(0, 0));
        assertTrue(board.isNewborn(0, 0));
        assertEquals(Pawn.State.NEWBORN, board.deriveState(0, 0));
        assertEquals(corner.getIndex(), board.getPawnCell(0, 0));
    }

    @Test
    void moveToFieldTransitionsToFielder() {
        Cell corner = board.getCorner(0);
        Cell fieldCell = corner.getNextFieldCell();

        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, fieldCell);

        assertTrue(board.isFielder(0, 0));
        assertEquals(Pawn.State.FIELDER, board.deriveState(0, 0));
        assertEquals(fieldCell.getIndex(), board.getPawnCell(0, 0));
    }

    @Test
    void moveToHomeTransitionsToHomer() {
        Cell corner = board.getCorner(0);
        Cell homeCell = corner.getNextHomeCell();

        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, homeCell);

        assertTrue(board.isHome(0, 0));
        assertEquals(Pawn.State.HOMER, board.deriveState(0, 0));
    }

    @Test
    void captureResetsToBench() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        board.capturePawn(0, 0);

        assertTrue(board.isBench(0, 0));
        assertEquals(Pawn.State.BENCH, board.deriveState(0, 0));
        assertEquals(-1, board.getPawnCell(0, 0));
    }

    @Test
    void findTargetCellFieldMove() {
        Cell corner = board.getCorner(0);
        Cell fieldCell = corner.getNextFieldCell();
        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, fieldCell);

        Cell target = board.findTargetCell(0, 0, 1);
        assertNotNull(target);
        assertEquals(fieldCell.getNextFieldCell(), target);
    }

    @Test
    void findTargetCellBlockedByFriendlyPawn() {
        Cell corner = board.getCorner(0);
        Cell cell1 = corner.getNextFieldCell();
        Cell cell2 = cell1.getNextFieldCell();

        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, cell1);

        board.placePawn(0, 1, corner);
        board.movePawn(0, 1, cell2);

        Cell target = board.findTargetCell(0, 0, 2);
        assertNull(target);
    }

    @Test
    void findTargetCellCanLandOnEnemy() {
        Cell corner0 = board.getCorner(0);
        Cell corner1 = board.getCorner(1);
        Cell targetCell = corner0.getNextFieldCell().getNextFieldCell();

        board.placePawn(0, 0, corner0);
        board.movePawn(0, 0, corner0.getNextFieldCell());

        board.placePawn(1, 0, corner1);
        board.movePawn(1, 0, targetCell);

        Cell target = board.findTargetCell(0, 0, 1);
        assertNotNull(target);
        assertEquals(targetCell, target);
    }

    @Test
    void findTargetCellNewbornMovesOnField() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        Cell target = board.findTargetCell(0, 0, 1);
        assertNotNull(target);
        assertEquals(corner.getNextFieldCell(), target);
    }

    @Test
    void findTargetCellNewbornDoesNotEnterHome() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        Cell target = board.findTargetCell(0, 0, 1);
        assertNotNull(target);
        assertNotEquals(Cell.CellType.HOME, target.getCellType());
    }

    @Test
    void findTargetCellHomerMovesInHome() {
        Cell corner = board.getCorner(0);
        Cell homeCell = corner.getNextHomeCell();
        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, homeCell);

        Cell target = board.findTargetCell(0, 0, 1);
        assertNotNull(target);
        assertEquals(homeCell.getNextHomeCell(), target);
    }

    @Test
    void findTargetCellOvershootHomeReturnsNull() {
        Cell corner = board.getCorner(0);
        Cell lastHome = corner.getNextHomeCell();
        while (lastHome.getNextHomeCell() != null) {
            lastHome = lastHome.getNextHomeCell();
        }
        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, lastHome);

        Cell target = board.findTargetCell(0, 0, 1);
        assertNull(target);
    }

    @Test
    void lastLapPawnWinsWithExactSteps() {
        // Place 3 pawns as HOMER
        for (int i = 1; i < config.numberOfPawns(); i++) {
            Cell home = board.getCorner(0).getNextHomeCell();
            for (int j = 0; j < i && home.getNextHomeCell() != null; j++) {
                home = home.getNextHomeCell();
            }
            board.placePawn(0, i, board.getCorner(0));
            board.movePawn(0, i, home);
        }

        Cell ownCorner = board.getCorner(0);

        // Walk forward from corner to find cell exactly 7 steps before corner
        Cell pos = ownCorner;
        for (int i = 0; i < 21; i++) {
            pos = pos.getNextFieldCell();
        }
        board.placePawn(0, 0, ownCorner);
        board.movePawn(0, 0, pos);

        // Exactly 7 steps reaches corner
        Cell target7 = board.findTargetCell(0, 0, 7);
        assertEquals(ownCorner, target7);

        // 8 steps overshoots — should be null
        Cell target8 = board.findTargetCell(0, 0, 8);
        assertNull(target8);

        // 6 steps doesn't reach corner
        Cell target6 = board.findTargetCell(0, 0, 6);
        assertNotNull(target6);
        assertNotEquals(ownCorner, target6);
    }
}
