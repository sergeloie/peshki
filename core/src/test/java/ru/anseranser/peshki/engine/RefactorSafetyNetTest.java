package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Characterization tests (ticket 01). Pin current core behaviour that the
 * refactor must preserve. If any of these fail during refactor waves,
 * behaviour has changed — stop and investigate.
 */
class RefactorSafetyNetTest {

    private GameConfig config;
    private Board board;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
    }

    @Test
    void captureKeepsSurvivorCellAndState() {
        Cell corner = board.getCorner(0);
        Cell cellA = corner.getNextFieldCell();
        Cell cellB = cellA.getNextFieldCell();

        board.placePawn(0, 0, corner);
        board.movePawn(0, 0, cellA);
        board.placePawn(0, 1, corner);
        board.movePawn(0, 1, cellB);

        int survivorCellBefore = board.getPawnCell(0, 1);

        board.capturePawn(0, 0);

        assertTrue(board.isBench(0, 0));
        assertEquals(survivorCellBefore, board.getPawnCell(0, 1));
        assertEquals(Pawn.State.FIELDER, board.deriveState(0, 1));
        assertEquals(config.numberOfPawns(), board.getPawnList(0).size());
    }

    @Test
    void newbornCornerSearchMatchesPositionalSearch() {
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);

        Cell fromPosition = board.findTargetCell(0, 0, 2);
        Cell fromCorner = board.findTargetCellFromCorner(0, 2);

        assertNotNull(fromPosition);
        assertNotNull(fromCorner);
        assertEquals(fromCorner, fromPosition);
    }

    @Test
    void benchPawnHasNoTarget() {
        assertNull(board.findTargetCell(0, 0, 3));
    }

    @Test
    void movedFlagTracksLifeCycle() {
        // place -> unmoved (NEWBORN); move -> moved (FIELDER);
        // capture -> bench; re-place -> unmoved again.
        Cell corner = board.getCorner(0);
        board.placePawn(0, 0, corner);
        assertFalse(board.getPosition().hasMoved(0, 0));

        Cell target = board.findTargetCell(0, 0, 3);
        assertNotNull(target);
        board.movePawn(0, 0, target);
        assertTrue(board.getPosition().hasMoved(0, 0));

        board.capturePawn(0, 0);
        assertTrue(board.isBench(0, 0));

        board.placePawn(0, 0, corner);
        assertFalse(board.getPosition().hasMoved(0, 0));
        assertTrue(board.isNewborn(0, 0));
    }

    @Test
    void generateAllMovesOffersPlaceAndPlaceAndMove() {
        GameEngine engine = new GameEngine(config);
        List<Move> moves = GameEngine.generateAllMoves(
                0, List.of(6, 2), engine.getBoard(), config);

        assertTrue(moves.stream().anyMatch(m ->
                m instanceof Move.Place p && p.steps() == 0
                        && m.consumedDice().equals(List.of(6))));
        assertTrue(moves.stream().anyMatch(m ->
                m instanceof Move.Place p && p.steps() == 2
                        && m.consumedDice().equals(List.of(6, 2))));
    }
}
