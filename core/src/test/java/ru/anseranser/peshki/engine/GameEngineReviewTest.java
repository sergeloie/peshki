package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Regression tests for the second review wave (BUG-11, BUG-12, BUG-18).
 * These verify the *behavior* of the engine after the fixes, not just that it
 * compiles: turn counting is consistent, placement events carry the correct
 * cell index, and the reported winner is the player who actually won (even
 * when that player is not the one whose turn is current).
 */
class GameEngineReviewTest {

    private final GameConfig config = GameConfig.DEFAULT;

    // BUG-11: advancePlayer must increment turnNumber (single source of truth).
    @Test
    void bug11_advancePlayerIncrementsTurnNumber() {
        GameEngine engine = new GameEngine(config);
        assertEquals(0, engine.getTurnNumber());

        engine.advancePlayer(false);

        assertEquals(1, engine.getTurnNumber(), "advancePlayer must count the turn");
        assertEquals(1, engine.getCurrentPlayerIndex(), "no extra turn -> next player");
    }

    // BUG-11: a bot turn must increment turnNumber exactly once (no double count
    // now that executeBotTurn delegates to advancePlayer).
    @Test
    void bug11_botTurnIncrementsTurnNumberExactlyOnce() {
        DiceRoller noSix = sides -> 1; // [1,1]: no 6, no placement possible at start
        GameEngine engine = new GameEngine(config, noSix);
        engine.rollDice();
        engine.executeBotTurn();

        assertEquals(1, engine.getTurnNumber(), "bot turn must increment turnNumber exactly once");
        assertEquals(1, engine.getCurrentPlayerIndex(), "no extra turn -> advance to next player");
    }

    // BUG-12: PawnPlaced must report the player's own corner index, not a
    // hardcoded 0. Driven through a full bot game so players 2-4 (corners 6/12/18)
    // are exercised — a hardcoded 0 would fail for them.
    @Test
    void bug12_pawnPlacedReportsCorrectCornerIndex() {
        DiceRoller alwaysSix = sides -> 6;
        GameEngine engine = new GameEngine(config, alwaysSix);
        engine.getBoard().getPlayers().forEach(p -> p.setHuman(false));

        int guard = 0;
        while (!engine.isGameOver() && guard < config.maxTurns()) {
            engine.rollDice();
            engine.executeBotTurn();
            guard++;
        }

        int spacing = config.fieldLength() / config.numberOfPlayers();
        List<GameEvent.PawnPlaced> placements = engine.getEventLog().stream()
                .filter(e -> e instanceof GameEvent.PawnPlaced)
                .map(e -> (GameEvent.PawnPlaced) e)
                .toList();

        assertFalse(placements.isEmpty(), "the game must contain placement events");
        for (GameEvent.PawnPlaced pp : placements) {
            int expectedCorner = (pp.playerNumber() - 1) * spacing;
            assertEquals(expectedCorner, pp.cellIndex(),
                    "PawnPlaced must report the placing player's own corner");
        }
    }

    // BUG-18: getState().winnerPlayerNumber() must be the player who actually won,
    // not the current player. Here player 2 has already won but it is player 1's
    // turn (currentPlayerIndex == 0). The buggy code returned currentPlayerIndex
    // (0); the fix scans hasWon() and returns 2.
    @Test
    void bug18_getStateReportsActualWinnerNotCurrentPlayer() {
        GameEngine engine = new GameEngine(config);
        Board board = engine.getBoard();
        Player winner = board.getPlayers().get(1); // player 2

        // Put 3 pawns of player 2 into HOME and the last one exactly on its corner.
        Cell corner = board.getCorner(winner);
        Cell h1 = corner.getNextHomeCell();
        Cell h2 = h1.getNextHomeCell();
        Cell h3 = h2.getNextHomeCell();
        List<Pawn> pawns = winner.getPawns();
        placePawn(pawns.get(0), Pawn.State.HOMER, h1);
        placePawn(pawns.get(1), Pawn.State.HOMER, h2);
        placePawn(pawns.get(2), Pawn.State.HOMER, h3);
        placePawn(pawns.get(3), Pawn.State.FIELDER, corner);

        GameState state = engine.getState();
        assertTrue(state.gameOver(), "player 2 has won");
        assertEquals(2, state.winnerPlayerNumber(),
                "winner must be the player who actually won (2), not the current player");
        assertNotEquals(engine.getCurrentPlayerIndex(), state.winnerPlayerNumber(),
                "current player (0) must not be reported as winner when player 2 won");
    }

    private static void placePawn(Pawn pawn, Pawn.State state, Cell cell) {
        if (cell.getPawn() != null) cell.getPawn().setCell(null);
        cell.setPawn(pawn);
        pawn.setCell(cell);
        pawn.setState(state);
    }
}
