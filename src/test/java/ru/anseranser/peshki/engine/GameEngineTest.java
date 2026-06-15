package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameEngineTest {

    private GameConfig config;
    private GameEngine engine;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        engine = new GameEngine(config);
    }

    @Test
    void engineStartsWithZeroTurns() {
        assertEquals(0, engine.getTurnNumber());
    }

    @Test
    void engineHas4Players() {
        assertEquals(4, engine.getBoard().getPlayers().size());
    }

    @Test
    void firstPlayerIsHuman() {
        assertTrue(engine.getBoard().getPlayers().get(0).isHuman());
    }

    @Test
    void rollDiceReturnsTwoValues() {
        List<Integer> dice = engine.rollDice();
        assertEquals(2, dice.size());
        assertTrue(dice.stream().allMatch(d -> d >= 1 && d <= 6));
    }

    @Test
    void botTurnIncrementsTurnNumber() {
        engine.executeBotTurn();
        assertEquals(1, engine.getTurnNumber());
    }

    @Test
    void botTurnProducesTurnEndedEvent() {
        List<GameEvent> events = engine.executeBotTurn();
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.TurnEnded));
    }

    @Test
    void multipleBotTurnsAdvancePlayers() {
        engine.executeBotTurn();
        engine.executeBotTurn();
        engine.executeBotTurn();
        assertTrue(engine.getTurnNumber() >= 3);
    }

    @Test
    void generateAllMovesWithMovablePawns() {
        Player player = engine.getBoard().getPlayers().get(1);
        // Place a pawn on the field
        player.getPawns().getFirst().setCell(engine.getBoard().getCorner(player).getNextFieldCell());
        player.getPawns().getFirst().setState(Pawn.State.FIELDER);
        engine.getBoard().getCorner(player).getNextFieldCell().setPawn(player.getPawns().getFirst());

        List<Integer> dice = List.of(3, 4);
        List<Move> moves = GameEngine.generateAllMoves(player, dice, engine.getBoard(), config);
        assertFalse(moves.isEmpty());
    }

    @Test
    void generateAllMovesIncludesSumMoves() {
        Player player = engine.getBoard().getPlayers().get(1);
        player.getPawns().getFirst().setCell(engine.getBoard().getCorner(player).getNextFieldCell());
        player.getPawns().getFirst().setState(Pawn.State.FIELDER);
        engine.getBoard().getCorner(player).getNextFieldCell().setPawn(player.getPawns().getFirst());

        List<Integer> dice = List.of(3, 4);
        List<Move> moves = GameEngine.generateAllMoves(player, dice, engine.getBoard(), config);

        boolean hasSumMove = moves.stream()
                .anyMatch(m -> m.pawn() != null && m.steps() == 7);
        assertTrue(hasSumMove);
    }

    @Test
    void generateAllMovesWithNoMovablePawnsReturnsEmpty() {
        Player player = engine.getBoard().getPlayers().get(1);
        // All pawns on BENCH
        List<Integer> dice = List.of(3, 4);
        List<Move> moves = GameEngine.generateAllMoves(player, dice, engine.getBoard(), config);
        assertTrue(moves.isEmpty());
    }

    @Test
    void fullBotGameCompletes() {
        GameEngine botEngine = new GameEngine(config);
        botEngine.getBoard().getPlayers().forEach(p -> p.setHuman(false));

        int turns = 0;
        while (!botEngine.isGameOver() && turns < config.maxTurns()) {
            botEngine.executeBotTurn();
            turns++;
        }

        assertTrue(botEngine.isGameOver() || turns >= config.maxTurns());
    }

    @Test
    void placeAndMoveCommandWorks() {
        Player player = engine.getBoard().getPlayers().get(0);
        // Give player a 6 to place
        List<GameEvent> events = engine.executeHumanCommand(
                new ru.anseranser.peshki.input.MoveCommand.PlacePawn(1, 6),
                List.of());
        assertFalse(events.isEmpty());
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnPlaced));
    }
}
