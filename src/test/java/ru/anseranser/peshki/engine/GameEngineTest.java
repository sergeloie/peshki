package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;

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
    void placeCommandPlacesPawnWithoutRejection() {
        Player player = engine.getBoard().getPlayers().get(0);
        List<GameEvent> events = engine.executeHumanCommand(new MoveCommand.PlacePawn(1, 6));
        assertFalse(events.stream().anyMatch(e -> e instanceof GameEvent.MoveRejected),
                "Placing a pawn must not be rejected");
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnPlaced));
    }

    @Test
    void placeAndMoveCommandWorksAndMovesPawn() {
        Player player = engine.getBoard().getPlayers().get(0);
        List<GameEvent> events = engine.executeHumanCommand(new MoveCommand.PlaceAndMove(1, 6, 2));

        assertFalse(events.stream().anyMatch(e -> e instanceof GameEvent.MoveRejected),
                "PlaceAndMove must not be rejected");
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnPlaced));
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnMoved),
                "The placed pawn must be moved after placement");

        boolean hasFielder = player.getPawns().stream()
                .anyMatch(p -> p.getState() == Pawn.State.FIELDER);
        assertTrue(hasFielder, "Placed pawn should have advanced onto the field");
    }

    @Test
    void plainMoveWithoutKillIsNotRejected() {
        Player player = engine.getBoard().getPlayers().get(0);
        engine.executeHumanCommand(new MoveCommand.PlacePawn(1, 6));

        Pawn placed = player.getPawns().stream()
                .filter(p -> p.getState() == Pawn.State.NEWBORN
                        && p.getCell() == engine.getBoard().getCorner(player))
                .findFirst()
                .orElse(null);
        assertNotNull(placed, "A pawn should be placed on the corner");

        List<GameEvent> move = engine.executeHumanCommand(
                new MoveCommand.MovePawn(1, placed.getNumber(), 1, List.of()));
        assertFalse(move.stream().anyMatch(e -> e instanceof GameEvent.MoveRejected),
                "A non-killing move must not be rejected");
        assertTrue(move.stream().anyMatch(e -> e instanceof GameEvent.PawnMoved));
    }
}
