package ru.anseranser.peshki.controller;

import org.junit.jupiter.api.Test;

import ru.anseranser.peshki.engine.Cell;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Pawn;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GameSessionIntegrationTest {

    @Test
    void fullBotGameReachesCompletionViaSession() {
        GameEngine engine = new GameEngine(GameConfig.DEFAULT);
        // Make every player a bot so the session can be driven headlessly.
        engine.getBoard().getPlayers().forEach(p -> p.setHuman(false));
        GameSession session = new GameSession(engine);

        int safety = GameConfig.DEFAULT.maxTurns() + 100;
        int turns = 0;
        while (!session.isGameOver() && turns < safety) {
            session.rollDice();
            session.playBotTurn();
            turns++;
        }

        assertTrue(session.isGameOver(), "Bot game should finish within the turn cap");
        GameState finalState = session.getState();
        assertTrue(finalState.gameOver());
        assertTrue(finalState.winnerPlayerNumber() >= 1, "A winner must be recorded");

        // The winning player must have all but the last pawn home, and the
        // remaining pawn must sit exactly on its own corner (the finish line),
        // per the game rules: 3 HOMER + last pawn on corner = win.
        GameState.PlayerState winner = finalState.players().stream()
                .filter(p -> p.number() == finalState.winnerPlayerNumber())
                .findFirst()
                .orElseThrow();
        long homeCount = winner.pawns().stream()
                .filter(pw -> pw.state() == Pawn.State.HOMER)
                .count();
        assertEquals(GameConfig.DEFAULT.numberOfPawns() - 1, homeCount,
                "Winner should have all but the last pawn home");

        int cornerIndex = finalState.cells().stream()
                .filter(c -> c.type() == Cell.CellType.CORNER
                        && c.ownerPlayerNumber() != null
                        && c.ownerPlayerNumber() == finalState.winnerPlayerNumber())
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
        engine.getBoard().getPlayers().forEach(p -> p.setHuman(false));
        GameSession session = new GameSession(engine);

        int[] eventCount = {0};
        session.addListener(e -> eventCount[0]++);

        session.rollDice();
        session.playBotTurn();

        assertTrue(eventCount[0] > 0, "Listener should have been notified of events");
    }
}
