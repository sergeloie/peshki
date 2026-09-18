package ru.anseranser.peshki.engine;

/**
 * The winning rule in exactly one place (ticket 07).
 * A player wins with all-but-one pawns home and the last pawn
 * standing exactly on its own corner.
 */
public final class WinChecker {

    private WinChecker() {}

    public static boolean hasWon(Board board, int playerIndex) {
        return hasWon(board.getConfig(), board.getTopology(), board.getPosition(), playerIndex);
    }

    public static boolean hasWon(PositionView view, int playerIndex) {
        return hasWon(view.config(), view.topology(), view.position(), playerIndex);
    }

    private static boolean hasWon(GameConfig config, BoardTopology topology,
                                  Position position, int playerIndex) {
        if (position.countHome(playerIndex) != config.numberOfPawns() - 1) {
            return false;
        }
        for (int ppi = 0; ppi < config.numberOfPawns(); ppi++) {
            if (!position.isHome(playerIndex, ppi)) {
                if (position.isBench(playerIndex, ppi)) {
                    return false;
                }
                if (position.isNewborn(playerIndex, ppi)) {
                    return false;
                }
                return position.cellOf(playerIndex, ppi)
                        == topology.cornerRingIndex(playerIndex);
            }
        }
        return false;
    }

    public static boolean isWinningMove(Board board, int playerIndex,
                                        int pawnIndex, int steps) {
        return isWinningMove(board.getConfig(), board.getTopology(),
                board.getPosition(), playerIndex, pawnIndex, steps);
    }

    public static boolean isWinningMove(PositionView view, int playerIndex,
                                        int pawnIndex, int steps) {
        return isWinningMove(view.config(), view.topology(),
                view.position(), playerIndex, pawnIndex, steps);
    }

    private static boolean isWinningMove(GameConfig config, BoardTopology topology,
                                         Position position, int playerIndex,
                                         int pawnIndex, int steps) {
        if (position.isHome(playerIndex, pawnIndex)) {
            return false;
        }
        Integer target = PathFinder.find(topology, position, playerIndex,
                position.cellOf(playerIndex, pawnIndex),
                steps, !position.isNewborn(playerIndex, pawnIndex));
        if (target == null || target != topology.cornerRingIndex(playerIndex)) {
            return false;
        }
        return position.countHome(playerIndex) == config.numberOfPawns() - 1;
    }

    /**
     * Snapshot variant for UI move highlighting (same rule, read-only view).
     */
    public static boolean isWinningSnapshotMove(GameState state, Move move,
                                                int playerIndex, GameConfig config) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        if (target.type() != Cell.CellType.CORNER) {
            return false;
        }
        if (target.ownerPlayerIndex() == null || target.ownerPlayerIndex() != playerIndex) {
            return false;
        }
        long homeCount = state.players().stream()
                .filter(p -> p.playerIndex() == playerIndex)
                .findFirst()
                .map(p -> p.pawns().stream()
                        .filter(pw -> pw.state() == Pawn.State.HOMER).count())
                .orElse(0L);
        return homeCount == config.numberOfPawns() - 1;
    }
}
