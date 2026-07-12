package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;

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
        Player p0 = board.getPlayers().get(0);
        Player p1 = board.getPlayers().get(1);
        Cell corner0 = board.getCorner(p0);
        Pawn enemy = p1.getPawns().get(0);
        corner0.setPawn(enemy);
        enemy.setCell(corner0);
        enemy.setState(Pawn.State.NEWBORN);

        List<GameEvent> events = engine.executeHumanCommand(new MoveCommand.PlacePawn(0, 6));

        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnKilled),
                "Placing on an enemy corner must emit PawnKilled");
        assertEquals(Pawn.State.BENCH, enemy.getState(), "Killed pawn returns to bench");
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
        botEngine.getBoard().getPlayers().forEach(p -> p.setHuman(false));
        botEngine.rollDice();
        botEngine.executeBotTurn();

        Player p0 = botEngine.getBoard().getPlayers().get(0);
        Cell corner = botEngine.getBoard().getCorner(p0);
        Cell twoSteps = corner.getNextFieldCell().getNextFieldCell();
        long onField = p0.getPawns().stream()
                .filter(p -> p.getState() == Pawn.State.FIELDER)
                .count();
        assertEquals(1, onField, "Exactly one pawn should be on the field");
        assertTrue(p0.getPawns().stream()
                        .anyMatch(p -> p.getState() == Pawn.State.FIELDER && p.getCell() == twoSteps),
                "The placed pawn must have consumed both dice (moved 2 steps)");
    }

    @Test
    void bug8_invalidMoveEmitsMoveRejected() {
        List<GameEvent> events = engine.executeHumanCommand(
                new MoveCommand.MovePawn(0, 1, 3, List.of(3)));
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.MoveRejected),
                "An impossible move must be rejected with feedback");
    }
}
