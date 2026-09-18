package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameEngineBugTest {

    private GameConfig config;
    private GameEngine engine;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        engine = new GameEngine(config);
    }

    @Test
    void bug1_placeOnEnemyCornerEmitsPawnKilled() {
        Board board = engine.getBoard();
        int p0 = 0;
        int p1 = 1;
        Cell corner0 = board.getCorner(p0);
        // Place an enemy pawn on corner0
        board.placePawn(p1, 0, corner0);

        List<Move> moves = MoveGenerator.generate(board, 0, List.of(6));
        Move place = moves.stream()
                .filter(m -> m instanceof Move.Place p && p.steps() == 0)
                .findFirst()
                .orElseThrow();
        List<GameEvent> events = new ArrayList<>();
        engine.applyMove(place, events);

        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnKilled),
                "Placing on an enemy corner must emit PawnKilled");
        assertTrue(board.isBench(p1, 0), "Killed pawn returns to bench");
    }

    @Test
    void bug2_botGetsExtraTurnWhenRollingSix() {
        DiceRoller sixRoller = sides -> 6;
        GameEngine botEngine = new GameEngine(config, sixRoller);
        botEngine.rollDice();
        List<GameEvent> events = botEngine.executeBotTurn();

        GameEvent.TurnEnded te = events.stream()
                .filter(e -> e instanceof GameEvent.TurnEnded)
                .map(e -> (GameEvent.TurnEnded) e)
                .findFirst()
                .orElseThrow();
        assertTrue(te.extraTurn(), "Rolling a 6 must grant the bot an extra turn");
    }

    @Test
    void bug3_botUsesBothDiceWhenPlacing() {
        DiceRoller roller = new DiceRoller() {
            private int i = 0;
            private final int[] vals = {6, 2};
            @Override
            public int roll(int sides) {
                return vals[i++ % vals.length];
            }
        };
        GameEngine botEngine = new GameEngine(config, roller);
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            botEngine.setHuman(pi, false);
        }
        botEngine.rollDice();
        botEngine.executeBotTurn();

        int p0 = 0;
        Board board = botEngine.getBoard();
        Cell twoSteps = board.getCorner(p0).getNextFieldCell().getNextFieldCell();
        int fielderCount = 0;
        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (board.isFielder(p0, ppi)) {
                fielderCount++;
            }
        }
        assertEquals(1, fielderCount, "Exactly one pawn should be on the field");

        boolean onTwoSteps = false;
        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (board.isFielder(p0, ppi)
                    && board.getPawnCell(p0, ppi) == twoSteps.getIndex()) {
                onTwoSteps = true;
            }
        }
        assertTrue(onTwoSteps,
                "The placed pawn must have consumed both dice (moved 2 steps)");
    }

    @Test
    void bug8_invalidMoveEmitsMoveRejected() {
        GameSession session = new GameSession(engine);
        session.rollDice();
        Move illegal = new Move.Step(0, 1, 3, List.of(3), -1);

        List<GameEvent> events = session.submitMove(illegal);

        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.MoveRejected),
                "An impossible move must be rejected with feedback");
    }
}
