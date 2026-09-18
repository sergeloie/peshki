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
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            engine.setHuman(pi, false);
        }

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
            int expectedCorner = pp.playerIndex() * spacing;
            assertEquals(expectedCorner, pp.cellIndex(),
                    "PawnPlaced must report the placing player's own corner");
        }
    }

    // BUG-18: getState().winnerPlayerIndex() must be the player who actually won,
    // not the current player. Here player 2 has already won but it is player 1's
    // turn (currentPlayerIndex == 0). The buggy code returned currentPlayerIndex
    // (0); the fix scans hasWon() and returns 2.
    @Test
    void bug18_getStateReportsActualWinnerNotCurrentPlayer() {
        GameEngine engine = new GameEngine(config);
        Board board = engine.getBoard();
        int winnerIndex = 1; // player 2 (0-based)

        // Put 3 pawns of player 2 into HOME and the last one exactly on its corner.
        Cell corner = board.getCorner(winnerIndex);
        Cell h1 = corner.getNextHomeCell();
        Cell h2 = h1.getNextHomeCell();
        Cell h3 = h2.getNextHomeCell();
        board.placePawn(winnerIndex, 0, h1);
        board.placePawn(winnerIndex, 1, h2);
        board.placePawn(winnerIndex, 2, h3);
        // Place last pawn on its corner as a FIELDER: put it on the adjacent
        // field cell first, then move it onto the corner. A pawn that has
        // travelled is a fielder, not a newborn (ticket 04: state derives
        // from Position, not from a mutable counter).
        board.placePawn(winnerIndex, 3, corner.getNextFieldCell());
        board.movePawn(winnerIndex, 3, corner);

        GameState state = engine.getState();
        assertTrue(state.gameOver(), "player 2 has won");
        assertEquals(winnerIndex, state.winnerPlayerIndex(),
                "winner must be the player who actually won (1), not the current player");
        assertNotEquals(engine.getCurrentPlayerIndex(), state.winnerPlayerIndex(),
                "current player (0) must not be reported as winner when player 2 won");
    }
}
