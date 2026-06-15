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

    @Test
    void selectBestMoveReturnsNonNull() {
        Player player = board.getPlayers().get(1);
        // Place a pawn on the field
        Pawn pawn = player.getPawns().getFirst();
        Cell fieldCell = board.getCorner(player).getNextFieldCell();
        pawn.setCell(fieldCell);
        pawn.setState(Pawn.State.FIELDER);
        fieldCell.setPawn(pawn);

        List<Move> moves = GameEngine.generateAllMoves(player, List.of(3, 4), board, config);
        if (!moves.isEmpty()) {
            Move best = strategy.selectBestMove(player, moves, config);
            assertNotNull(best);
        }
    }

    @Test
    void selectBestMoveReturnsHighestScored() {
        Player player = board.getPlayers().get(1);
        Player enemy = board.getPlayers().get(0);

        // Place my pawn on field
        Pawn myPawn = player.getPawns().getFirst();
        Cell myCell = board.getCorner(player).getNextFieldCell();
        myPawn.setCell(myCell);
        myPawn.setState(Pawn.State.FIELDER);
        myCell.setPawn(myPawn);

        // Place enemy pawn 1 step ahead
        Pawn enemyPawn = enemy.getPawns().getFirst();
        Cell enemyCell = myCell.getNextFieldCell();
        enemyPawn.setCell(enemyCell);
        enemyPawn.setState(Pawn.State.FIELDER);
        enemyCell.setPawn(enemyPawn);

        // Create moves: one that kills, one that doesn't
        Move killMove = new Move(myPawn, 1, List.of(1));
        Move normalMove = new Move(player.getPawns().get(1), 1, List.of(1));

        // Place second pawn for normal move
        Pawn pawn2 = player.getPawns().get(1);
        Cell cell2 = board.getCorner(player).getNextFieldCell().getNextFieldCell().getNextFieldCell();
        pawn2.setCell(cell2);
        pawn2.setState(Pawn.State.FIELDER);
        cell2.setPawn(pawn2);

        Move best = strategy.selectBestMove(player, List.of(killMove, normalMove), config);
        assertNotNull(best);
        assertEquals(killMove, best);
    }

    @Test
    void botDoesNotCrashWithEmptyMoves() {
        Player player = board.getPlayers().get(1);
        Move best = strategy.selectBestMove(player, List.of(), config);
        assertNull(best);
    }
}
