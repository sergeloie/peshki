package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PlayerTest {

    private GameConfig config;
    private Board board;
    private Player player;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
        player = board.getPlayers().get(0);
    }

    @Test
    void renumberAllOnBenchKeepsOrder() {
        player.renumber();
        for (int i = 0; i < 4; i++) {
            assertEquals(i + 1, player.getPawns().get(i).getNumber());
        }
    }

    @Test
    void renumberFielderCloserToFinishGetsLowerNumber() {
        Cell corner = board.getCorner(player);
        Cell far = corner.getNextFieldCell();
        Cell near = far;
        for (int i = 0; i < 22; i++) {
            near = near.getNextFieldCell();
        }

        Pawn pawnFar = player.getPawns().get(0);
        pawnFar.setCell(far);
        pawnFar.setState(Pawn.State.FIELDER);
        far.setPawn(pawnFar);

        Pawn pawnNear = player.getPawns().get(1);
        pawnNear.setCell(near);
        pawnNear.setState(Pawn.State.FIELDER);
        near.setPawn(pawnNear);

        player.renumber();

        assertEquals(1, pawnNear.getNumber());
        assertEquals(2, pawnFar.getNumber());
    }

    @Test
    void renumberHomerBeatsFielder() {
        Cell corner = board.getCorner(player);
        Cell fieldCell = corner.getNextFieldCell();
        Cell homeCell = corner.getNextHomeCell();

        Pawn homer = player.getPawns().get(0);
        homer.setCell(homeCell);
        homer.setState(Pawn.State.HOMER);
        homeCell.setPawn(homer);

        Pawn fielder = player.getPawns().get(1);
        fielder.setCell(fieldCell);
        fielder.setState(Pawn.State.FIELDER);
        fieldCell.setPawn(fielder);

        player.renumber();

        assertEquals(1, homer.getNumber());
        assertEquals(2, fielder.getNumber());
    }

    @Test
    void renumberHomerFurtherInHomeBeatsHomerCloser() {
        Cell corner = board.getCorner(player);
        Cell home1 = corner.getNextHomeCell();
        Cell home2 = home1.getNextHomeCell();

        Pawn homer1 = player.getPawns().get(0);
        homer1.setCell(home1);
        homer1.setState(Pawn.State.HOMER);
        home1.setPawn(homer1);

        Pawn homer2 = player.getPawns().get(1);
        homer2.setCell(home2);
        homer2.setState(Pawn.State.HOMER);
        home2.setPawn(homer2);

        player.renumber();

        assertEquals(1, homer2.getNumber());
        assertEquals(2, homer1.getNumber());
    }

    @Test
    void renumberNewbornAfterFielder() {
        Cell corner = board.getCorner(player);
        Cell fieldCell = corner.getNextFieldCell();

        Pawn fielder = player.getPawns().get(0);
        fielder.setCell(fieldCell);
        fielder.setState(Pawn.State.FIELDER);
        fieldCell.setPawn(fielder);

        Pawn newborn = player.getPawns().get(1);
        newborn.setCell(corner);
        newborn.setState(Pawn.State.NEWBORN);
        corner.setPawn(newborn);

        player.renumber();

        assertEquals(1, fielder.getNumber());
        assertEquals(2, newborn.getNumber());
    }

    @Test
    void renumberFielderOnCornerGetsBestProgress() {
        Cell corner = board.getCorner(player);
        Pawn pawnOnCorner = player.getPawns().get(0);
        pawnOnCorner.setCell(corner);
        pawnOnCorner.setState(Pawn.State.FIELDER);
        corner.setPawn(pawnOnCorner);

        Pawn pawnOnField = player.getPawns().get(1);
        Cell fieldCell = corner.getNextFieldCell();
        pawnOnField.setCell(fieldCell);
        pawnOnField.setState(Pawn.State.FIELDER);
        fieldCell.setPawn(pawnOnField);

        player.renumber();

        assertEquals(1, pawnOnCorner.getNumber());
        assertEquals(2, pawnOnField.getNumber());
    }

    @Test
    void renumberAfterMoveUpdatesNumbers() {
        Cell corner = board.getCorner(player);
        Cell cell1 = corner.getNextFieldCell();
        Cell cell2 = cell1.getNextFieldCell();

        Pawn pawn1 = player.getPawns().get(0);
        pawn1.setCell(cell1);
        pawn1.setState(Pawn.State.FIELDER);
        cell1.setPawn(pawn1);

        Pawn pawn2 = player.getPawns().get(1);
        pawn2.setCell(cell2);
        pawn2.setState(Pawn.State.FIELDER);
        cell2.setPawn(pawn2);

        player.renumber();
        assertEquals(2, pawn1.getNumber());
        assertEquals(1, pawn2.getNumber());

        pawn1.moveTo(cell2.getNextFieldCell());
        cell2.getNextFieldCell().setPawn(pawn1);
        cell2.setPawn(null);

        player.renumber();
        assertEquals(1, pawn1.getNumber());
        assertEquals(2, pawn2.getNumber());
    }
}
