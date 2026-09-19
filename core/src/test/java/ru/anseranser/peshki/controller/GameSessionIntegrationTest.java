package ru.anseranser.peshki.controller;

import org.junit.jupiter.api.Test;

import ru.anseranser.peshki.engine.Cell;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.MoveSelector;
import ru.anseranser.peshki.engine.Pawn;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GameSessionIntegrationTest {

    @Test
    void fullBotGameReachesCompletionViaSession() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        GameSession session = new GameSession(engine);

        int safety = GameConfig.DEFAULT.maxTurns() + 100;
        int turns = 0;
        while (!session.isGameOver() && turns < safety) {
            session.rollDice();
            session.playCurrentTurn();
            turns++;
        }

        assertTrue(session.isGameOver(), "Bot game should finish within the turn cap");
        GameState finalState = session.getState();
        assertTrue(finalState.gameOver());
        assertTrue(finalState.winnerPlayerIndex() >= 0, "A winner must be recorded");

        // The winning player must have all but the last pawn home, and the
        // remaining pawn must sit exactly on its own corner (the finish line),
        // per the game rules: 3 HOMER + last pawn on corner = win.
        GameState.PlayerState winner = finalState.players().stream()
                .filter(p -> p.playerIndex() == finalState.winnerPlayerIndex())
                .findFirst()
                .orElseThrow();
        long homeCount = winner.pawns().stream()
                .filter(pw -> pw.state() == Pawn.State.HOMER)
                .count();
        assertEquals(GameConfig.DEFAULT.numberOfPawns() - 1, homeCount,
                "Winner should have all but the last pawn home");

        int cornerIndex = finalState.cells().stream()
                .filter(c -> c.type() == Cell.CellType.CORNER
                        && c.ownerPlayerIndex() != null
                        && c.ownerPlayerIndex() == finalState.winnerPlayerIndex())
                .mapToInt(GameState.CellState::index)
                .findFirst()
                .orElse(-1);
        boolean lastPawnOnCorner = winner.pawns().stream()
                .anyMatch(pw -> pw.state() == Pawn.State.FIELDER && pw.cellIndex() == cornerIndex);
        assertTrue(lastPawnOnCorner, "The last pawn must sit on the winner's own corner");
    }

    @Test
    void listenersReceiveEventsDuringPlay() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        GameSession session = new GameSession(engine);

        int[] eventCount = {0};
        session.addListener(e -> eventCount[0]++);

        session.rollDice();
        session.playCurrentTurn();

        assertTrue(eventCount[0] > 0, "Listener should have been notified of events");
    }

    @Test
    void stepwiseSubmitLoopCompletesATurn() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        GameSession session = new GameSession(engine);

        session.rollDice();
        boolean turnEndedClean = false;
        int guard = 0;
        while (!turnEndedClean && guard++ < 50) {
            List<Move> legal = session.getAvailableMoves();
            if (legal.isEmpty()) {
                if (session.getRemainingDice().isEmpty()) {
                    session.rollDice();
                } else {
                    session.skipTurn();
                }
                continue;
            }
            int current = session.getCurrentPlayerIndex();
            List<GameEvent> events = session.submitMove(legal.getFirst());
            if (events.stream().anyMatch(
                    e -> e instanceof GameEvent.TurnEnded te && !te.extraTurn())) {
                turnEndedClean = true;
                assertEquals((current + 1) % GameConfig.DEFAULT.numberOfPlayers(),
                        session.getCurrentPlayerIndex(),
                        "Clean TurnEnded must advance to the next player");
            }
        }

        assertTrue(turnEndedClean, "Stepwise submits must close the turn with TurnEnded");
    }

    @Test
    void controllerCanBeSwappedMidGame() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        GameSession session = new GameSession(engine);

        session.rollDice();
        session.playCurrentTurn();

        // Swap player 1 to a scripted controller mid-game: same interface.
        MoveSelector firstMove = (context, legalMoves) -> legalMoves.getFirst();
        session.setController(1, firstMove, false);

        assertSame(firstMove, session.getController(1));

        int turns = 0;
        while (!session.isGameOver() && turns < 200) {
            session.rollDice();
            session.playCurrentTurn();
            turns++;
        }

        assertTrue(turns > 0, "Game must progress after the swap");
    }
}
