package ru.anseranser.peshki.ai;

import ru.anseranser.peshki.engine.*;

import java.util.Comparator;
import java.util.List;

/**
 * Heuristic bot: one {@link MoveSelector} among others (ticket 08).
 * Reads only the immutable {@link PositionView} — the same input
 * a future neural network will consume.
 */
public class BotStrategy implements MoveSelector {

    @Override
    public Move select(MoveContext context, List<Move> legalMoves) {
        if (legalMoves.isEmpty()) {
            return null;
        }
        PositionView view = context.board();
        int playerIndex = legalMoves.getFirst().playerIndex();
        return legalMoves.stream()
                .max(Comparator.comparingInt(m -> scoreMove(view, playerIndex, m)))
                .orElse(null);
    }

    private int scoreMove(PositionView view, int playerIndex, Move move) {
        return switch (move) {
            case Move.Place p -> scorePlace(view, playerIndex);
            case Move.Step s -> scoreStep(view, playerIndex, s);
        };
    }

    private int scorePlace(PositionView view, int playerIndex) {
        int[] occ = view.occupantAt(view.ownCorner(playerIndex));
        if (occ != null && occ[0] != playerIndex) {
            return 800_000;
        }
        return 100_000;
    }

    private int scoreStep(PositionView view, int playerIndex, Move.Step step) {
        int ppi = step.pawnIndex();
        Integer target = view.findTarget(playerIndex, ppi, step.steps());
        if (target == null) {
            return -1;
        }

        int[] occ = view.occupantAt(target);
        boolean killsEnemy = !view.isHome(playerIndex, ppi)
                && occ != null
                && occ[0] != playerIndex;

        int enemyIndex = killsEnemy ? occ[0] : -1;

        boolean entersHome = view.isFielder(playerIndex, ppi)
                && view.isHomeCell(target);

        int source = view.cellOf(playerIndex, ppi);
        boolean onEnemyCorner = view.isCornerCell(source)
                && view.cornerOwner(source) != playerIndex;
        boolean onOwnCorner = view.isOwnCornerCell(source, playerIndex);

        if (WinChecker.isWinningMove(view, playerIndex, ppi, step.steps())) {
            return 1_000_000;
        }
        if (killsEnemy && isEnemyLastFieldPawn(view, enemyIndex)) {
            return 900_000;
        }
        if (killsEnemy) {
            return 800_000;
        }
        if (entersHome) {
            return 700_000;
        }
        if (onEnemyCorner) {
            return 600_000;
        }
        if (onOwnCorner) {
            return 500_000;
        }

        int maxDistance = view.config().fieldLength();
        int distance = view.ringDistanceToOwnCorner(playerIndex, ppi);
        return 400_000 + (maxDistance - distance);
    }

    private boolean isEnemyLastFieldPawn(PositionView view, int enemyIndex) {
        if (enemyIndex < 0) {
            return false;
        }
        GameConfig config = view.config();
        long homeCount = view.countHome(enemyIndex);
        long fieldCount = 0;
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (view.isFielder(enemyIndex, i)) {
                fieldCount++;
            }
        }
        return homeCount == config.numberOfPawns() - 1 && fieldCount == 1;
    }
}
