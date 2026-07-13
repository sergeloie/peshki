package ru.anseranser.peshki;

import org.junit.jupiter.api.Test;

import ru.anseranser.peshki.engine.DiceRoller;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.InputService;
import ru.anseranser.peshki.output.OutputService;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression test for the "bots never move" bug: the human turn did not advance
 * the current player, so the human kept playing every turn and the bots were
 * never reached. The fix makes {@link Main#runGame} call
 * {@code engine.advancePlayer(extraTurn)} after a human turn.
 */
class MainGameLoopTest {

    @Test
    void humanTurnAdvancesSoAllPlayersIncludingBotsTakeTurns() {
        DiceRoller roller = new FixedDiceRoller(3, 2);
        GameEngine engine = new GameEngine(
                new GameConfig(8, 4, 4, 2, 6, 50), roller);

        Set<Integer> playersWhoTookTurns = new HashSet<>();
        OutputService recordingOutput = new RecordingOutput(playersWhoTookTurns);
        InputService input = (state, availableMoves, allDice, usedDice, config) -> {
            throw new UnsupportedOperationException("human should have no moves with dice " + allDice);
        };

        Main.runGame(engine, input, recordingOutput);

        assertTrue(playersWhoTookTurns.contains(1), "Human (player 1) must take a turn");
        assertTrue(playersWhoTookTurns.contains(2), "Bot (player 2) must take a turn");
        assertTrue(playersWhoTookTurns.contains(3), "Bot (player 3) must take a turn");
        assertTrue(playersWhoTookTurns.contains(4), "Bot (player 4) must take a turn");
    }

    private static class FixedDiceRoller implements DiceRoller {
        private final int[] seq;
        private int i = 0;

        FixedDiceRoller(int... seq) {
            this.seq = seq;
        }

        @Override
        public int roll(int sides) {
            return seq[i++ % seq.length];
        }
    }

    private static class RecordingOutput implements OutputService {
        private final Set<Integer> players;

        RecordingOutput(Set<Integer> players) {
            this.players = players;
        }

        @Override
        public void onTurnHeader(int turnNumber, int playerNumber, boolean isHuman) {
            players.add(playerNumber);
        }

        @Override public void onEvents(List<GameEvent> events) {}
        @Override public void onGameWon(int playerNumber) {}
        @Override public void onBoard(GameState state) {}
        @Override public String[] snapshotBoard(GameState state) { return new String[0]; }
        @Override public void onBoardBeforeAfter(String[] beforeLines, String[] afterLines) {}
        @Override public void onGameEnded(int maxTurns) {}
    }
}
