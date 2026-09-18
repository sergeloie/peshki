package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.engine.event.GameEvent;

import java.util.ArrayList;
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
        assertEquals(4, engine.getBoard().getCorners().length);
    }

    @Test
    void firstPlayerIsHuman() {
        assertTrue(engine.isHuman(0));
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
        Board board = engine.getBoard();
        int playerIndex = 1;
        // Place a pawn on the field
        board.placePawn(playerIndex, 0, board.getCorner(playerIndex).getNextFieldCell());

        List<Integer> dice = List.of(3, 4);
        List<Move> moves = GameEngine.generateAllMoves(playerIndex, dice, board, config);
        assertFalse(moves.isEmpty());
    }

    @Test
    void generateAllMovesIncludesSumMoves() {
        Board board = engine.getBoard();
        int playerIndex = 1;
        board.placePawn(playerIndex, 0, board.getCorner(playerIndex).getNextFieldCell());

        List<Integer> dice = List.of(3, 4);
        List<Move> moves = GameEngine.generateAllMoves(playerIndex, dice, board, config);

        boolean hasSumMove = moves.stream()
                .anyMatch(m -> m instanceof Move.Step s && s.steps() == 7);
        assertTrue(hasSumMove);
    }

    @Test
    void generateAllMovesWithNoMovablePawnsReturnsEmpty() {
        int playerIndex = 1;
        // All pawns on BENCH
        List<Integer> dice = List.of(3, 4);
        List<Move> moves = GameEngine.generateAllMoves(playerIndex, dice, engine.getBoard(), config);
        assertTrue(moves.isEmpty());
    }

    @Test
    void fullBotGameCompletes() {
        GameEngine botEngine = new GameEngine(config);
        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            botEngine.setHuman(pi, false);
        }

        int turns = 0;
        while (!botEngine.isGameOver() && turns < config.maxTurns()) {
            botEngine.executeBotTurn();
            turns++;
        }

        assertTrue(botEngine.isGameOver() || turns >= config.maxTurns());
    }

    @Test
    void placeMoveAppliesPawnPlaced() {
        List<Move> moves = MoveGenerator.generate(engine.getBoard(), 0, List.of(6));
        Move place = moves.stream()
                .filter(m -> m instanceof Move.Place p && p.steps() == 0)
                .findFirst()
                .orElseThrow();

        List<GameEvent> events = new ArrayList<>();
        engine.applyMove(place, events);

        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnPlaced));
    }

    @Test
    void placeAndMoveAppliesPlacedAndMoved() {
        int playerIndex = 0;
        List<Move> moves = MoveGenerator.generate(engine.getBoard(), playerIndex, List.of(6, 2));
        Move placeAndMove = moves.stream()
                .filter(m -> m instanceof Move.Place p && p.steps() == 2)
                .findFirst()
                .orElseThrow();

        List<GameEvent> events = new ArrayList<>();
        engine.applyMove(placeAndMove, events);

        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnPlaced));
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnMoved),
                "The placed pawn must be moved after placement");

        Board board = engine.getBoard();
        boolean hasFielder = false;
        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (board.isFielder(playerIndex, ppi)) {
                hasFielder = true;
                break;
            }
        }
        assertTrue(hasFielder, "Placed pawn should have advanced onto the field");
    }

    @Test
    void plainMoveWithoutKillEmitsPawnMoved() {
        int playerIndex = 0;
        Board board = engine.getBoard();
        List<Move> placements = MoveGenerator.generate(board, playerIndex, List.of(6));
        Move place = placements.stream()
                .filter(m -> m instanceof Move.Place p && p.steps() == 0)
                .findFirst()
                .orElseThrow();
        engine.applyMove(place, new ArrayList<>());

        int placedPpi = -1;
        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (board.isNewborn(playerIndex, ppi)
                    && board.getPawnCell(playerIndex, ppi) == board.getCorner(playerIndex).getIndex()) {
                placedPpi = ppi;
                break;
            }
        }
        assertTrue(placedPpi >= 0, "A pawn should be placed on the corner");

        List<Move> steps = MoveGenerator.generate(board, playerIndex, List.of(1));
        Move step = null;
        for (Move m : steps) {
            if (m instanceof Move.Step s && s.pawnIndex() == placedPpi) {
                step = s;
                break;
            }
        }
        assertNotNull(step, "Placed pawn should have a 1-step move");

        List<GameEvent> events = new ArrayList<>();
        engine.applyMove(step, events);
        assertTrue(events.stream().anyMatch(e -> e instanceof GameEvent.PawnMoved));
    }
}
