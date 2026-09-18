package ru.anseranser.peshki.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.engine.*;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BotStrategyTest {

    private GameConfig config;
    private Board board;
    private BotStrategy strategy;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        board = new Board(config);
        strategy = new BotStrategy();
    }

    private MoveContext context(Board b, List<Integer> dice) {
        return new MoveContext(null, PositionView.snapshot(b),
                new DiceSet(dice), List.copyOf(dice));
    }

    @Test
    void selectBestMoveReturnsNonNull() {
        int playerIndex = 1;
        // Place a pawn on the field
        board.placePawn(playerIndex, 0, board.getCorner(playerIndex).getNextFieldCell());

        List<Move> moves = GameEngine.generateAllMoves(playerIndex, List.of(3, 4), board, config);
        if (!moves.isEmpty()) {
            Move best = strategy.select(context(board, List.of(3, 4)), moves);
            assertNotNull(best);
        }
    }

    @Test
    void selectBestMoveReturnsHighestScored() {
        int playerIndex = 1;
        int enemyIndex = 0;

        // Place my pawn on field
        Cell myCell = board.getCorner(playerIndex).getNextFieldCell();
        board.placePawn(playerIndex, 0, myCell);

        // Place enemy pawn 1 step ahead
        Cell enemyCell = myCell.getNextFieldCell();
        board.placePawn(enemyIndex, 0, enemyCell);

        // Create moves: one that kills, one that doesn't
        Move killMove = new Move.Step(playerIndex, 0, 1, List.of(1), enemyCell.getIndex());

        // Place second pawn for normal move
        Cell cell2 = board.getCorner(playerIndex).getNextFieldCell().getNextFieldCell().getNextFieldCell();
        board.placePawn(playerIndex, 1, cell2);
        Move normalMove = new Move.Step(playerIndex, 1, 1, List.of(1),
                board.findTargetCell(playerIndex, 1, 1).getIndex());

        Move best = strategy.select(context(board, List.of(1)),
                List.of(killMove, normalMove));
        assertNotNull(best);
        assertEquals(killMove, best);
    }

    @Test
    void botDoesNotCrashWithEmptyMoves() {
        Move best = strategy.select(context(board, List.of(1)), List.of());
        assertNull(best);
    }
}
