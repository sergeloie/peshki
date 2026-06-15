package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PawnTest {

    private GameConfig config;
    private Board board;
    private Player player1;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
        player1 = board.getPlayers().get(0);
    }

    @Test
    void pawnStartsOnBench() {
        Pawn pawn = player1.getPawns().getFirst();
        assertEquals(Pawn.State.BENCH, pawn.getState());
        assertNull(pawn.getCell());
    }

    @Test
    void pawnCanBePlacedOnCorner() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        corner.setPawn(pawn);
        pawn.setCell(corner);
        pawn.setState(Pawn.State.NEWBORN);

        assertEquals(Pawn.State.NEWBORN, pawn.getState());
        assertEquals(corner, pawn.getCell());
    }

    @Test
    void moveToFieldTransitionsToFielder() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        Cell fieldCell = corner.getNextFieldCell();

        pawn.setCell(corner);
        pawn.setState(Pawn.State.NEWBORN);
        corner.setPawn(pawn);

        pawn.moveTo(fieldCell);

        assertEquals(Pawn.State.FIELDER, pawn.getState());
        assertEquals(fieldCell, pawn.getCell());
        assertNull(corner.getPawn());
        assertEquals(pawn, fieldCell.getPawn());
    }

    @Test
    void moveToHomeTransitionsToHomer() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        Cell homeCell = corner.getNextHomeCell();

        pawn.setCell(corner);
        pawn.setState(Pawn.State.FIELDER);
        corner.setPawn(pawn);

        pawn.moveTo(homeCell);

        assertEquals(Pawn.State.HOMER, pawn.getState());
        assertEquals(homeCell, pawn.getCell());
    }

    @Test
    void removeKicksPawnBackToBench() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        pawn.setCell(corner);
        pawn.setState(Pawn.State.NEWBORN);
        corner.setPawn(pawn);

        pawn.remove();

        assertEquals(Pawn.State.BENCH, pawn.getState());
        assertNull(pawn.getCell());
        assertNull(corner.getPawn());
    }

    @Test
    void removeThrowsForHomer() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        Cell homeCell = corner.getNextHomeCell();
        pawn.setCell(homeCell);
        pawn.setState(Pawn.State.HOMER);
        homeCell.setPawn(pawn);

        assertThrows(IllegalStateException.class, pawn::remove);
    }

    @Test
    void removeThrowsForBench() {
        Pawn pawn = player1.getPawns().getFirst();
        assertThrows(IllegalStateException.class, pawn::remove);
    }

    @Test
    void findTargetCellFieldMove() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        Cell fieldCell = corner.getNextFieldCell();
        pawn.setCell(fieldCell);
        pawn.setState(Pawn.State.FIELDER);
        fieldCell.setPawn(pawn);

        Cell target = pawn.findTargetCell(1, config);
        assertNotNull(target);
        assertEquals(fieldCell.getNextFieldCell(), target);
    }

    @Test
    void findTargetCellBlockedByFriendlyPawn() {
        Pawn pawn1 = player1.getPawns().get(0);
        Pawn pawn2 = player1.getPawns().get(1);
        Cell corner = board.getCorner(player1);
        Cell cell1 = corner.getNextFieldCell();
        Cell cell2 = cell1.getNextFieldCell();

        pawn1.setCell(cell1);
        pawn1.setState(Pawn.State.FIELDER);
        cell1.setPawn(pawn1);

        pawn2.setCell(cell2);
        pawn2.setState(Pawn.State.FIELDER);
        cell2.setPawn(pawn2);

        Cell target = pawn1.findTargetCell(2, config);
        assertNull(target);
    }

    @Test
    void findTargetCellCanLandOnEnemy() {
        Player player2 = board.getPlayers().get(1);
        Pawn myPawn = player1.getPawns().get(0);
        Pawn enemyPawn = player2.getPawns().get(0);

        Cell corner = board.getCorner(player1);
        Cell targetCell = corner.getNextFieldCell().getNextFieldCell();

        myPawn.setCell(corner.getNextFieldCell());
        myPawn.setState(Pawn.State.FIELDER);
        corner.getNextFieldCell().setPawn(myPawn);

        enemyPawn.setCell(targetCell);
        enemyPawn.setState(Pawn.State.FIELDER);
        targetCell.setPawn(enemyPawn);

        Cell target = myPawn.findTargetCell(1, config);
        assertNotNull(target);
        assertEquals(targetCell, target);
    }

    @Test
    void findTargetCellNewbornMovesOnField() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        pawn.setCell(corner);
        pawn.setState(Pawn.State.NEWBORN);
        corner.setPawn(pawn);

        Cell target = pawn.findTargetCell(1, config);
        assertNotNull(target);
        assertEquals(corner.getNextFieldCell(), target);
    }

    @Test
    void findTargetCellNewbornDoesNotEnterHome() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        pawn.setCell(corner);
        pawn.setState(Pawn.State.NEWBORN);
        corner.setPawn(pawn);

        Cell target = pawn.findTargetCell(1, config);
        assertNotNull(target);
        assertNotEquals(Cell.CellType.HOME, target.getCellType());
    }

    @Test
    void findTargetCellHomerMovesInHome() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        Cell homeCell = corner.getNextHomeCell();
        pawn.setCell(homeCell);
        pawn.setState(Pawn.State.HOMER);
        homeCell.setPawn(pawn);

        Cell target = pawn.findTargetCell(1, config);
        assertNotNull(target);
        assertEquals(homeCell.getNextHomeCell(), target);
    }

    @Test
    void findTargetCellOvershootHomeReturnsNull() {
        Pawn pawn = player1.getPawns().getFirst();
        Cell corner = board.getCorner(player1);
        Cell lastHome = corner.getNextHomeCell();
        while (lastHome.getNextHomeCell() != null) {
            lastHome = lastHome.getNextHomeCell();
        }
        pawn.setCell(lastHome);
        pawn.setState(Pawn.State.HOMER);
        lastHome.setPawn(pawn);

        Cell target = pawn.findTargetCell(1, config);
        assertNull(target);
    }

    @Test
    void pawnNumberIsSetCorrectly() {
        Pawn pawn = player1.getPawns().getFirst();
        assertEquals(1, pawn.getNumber());
        pawn.setNumber(3);
        assertEquals(3, pawn.getNumber());
    }
}
