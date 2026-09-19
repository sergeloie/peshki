package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Locks the winning-move hint mechanic shared by console ([WIN!])
 * and desktop ((WIN!)): exactly one generated move must be flagged
 * when the last pawn can land exactly on its corner.
 */
class WinCheckerTest {

    private GameConfig config;
    private GameEngine engine;

    @BeforeEach
    void setUp() {
        config = GameConfig.DEFAULT;
        engine = new GameEngine(config);
    }

    @Test
    void snapshotFlagsExactlyTheWinningMove() {
        Board board = engine.getBoard();
        int playerIndex = 0;
        Cell corner = board.getCorner(playerIndex);

        // 3 pawns home.
        Cell home = corner.getNextHomeCell();
        for (int ppi = 0; ppi < config.numberOfPawns() - 1; ppi++) {
            board.placePawn(playerIndex, ppi, corner);
            board.movePawn(playerIndex, ppi, home);
            home = home.getNextHomeCell();
        }

        // Last pawn one step before the corner.
        Cell before = corner;
        for (int i = 0; i < board.getTopology().ringSize() - 1; i++) {
            before = before.getNextFieldCell();
        }
        board.placePawn(playerIndex, 3, before);

        GameState state = engine.getState();
        List<Move> moves = MoveGenerator.generate(board, playerIndex, List.of(1));

        assertFalse(moves.isEmpty());
        for (Move move : moves) {
            boolean expected = move.targetCellIndex() == corner.getIndex();
            assertEquals(expected,
                    WinChecker.isWinningSnapshotMove(state, move, playerIndex, config),
                    "Only the exact-corner move must be flagged WIN, got: " + move);
        }
        assertTrue(moves.stream().anyMatch(m ->
                WinChecker.isWinningSnapshotMove(state, m, playerIndex, config)),
                "A winning move must be present");
    }

    @Test
    void snapshotFlagsNothingMidGame() {
        Board board = engine.getBoard();
        board.placePawn(0, 0, board.getCorner(0));

        GameState state = engine.getState();
        List<Move> moves = MoveGenerator.generate(board, 0, List.of(3));

        assertFalse(moves.isEmpty());
        for (Move move : moves) {
            assertFalse(WinChecker.isWinningSnapshotMove(state, move, 0, config));
        }
    }
}
