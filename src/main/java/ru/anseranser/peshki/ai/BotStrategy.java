package ru.anseranser.peshki.ai;

import ru.anseranser.peshki.engine.*;

import java.util.Comparator;
import java.util.List;

import static ru.anseranser.peshki.engine.Pawn.State.BENCH;
import static ru.anseranser.peshki.engine.Pawn.State.HOMER;

public class BotStrategy {

    public Move selectBestMove(Player player, List<Move> availableMoves, GameConfig config) {
        return availableMoves.stream()
                .max(Comparator.comparingInt(m -> scoreMove(player, m, config)))
                .orElse(null);
    }

    private int scoreMove(Player player, Move move, GameConfig config) {
        if (move.pawn() == null) {
            Cell cornerCell = player.getCorner();
            Pawn existingPawn = cornerCell.getPawn();
            if (existingPawn != null && !existingPawn.getPlayer().equals(player)) {
                return 800_000;
            }
            return 100_000;
        }

        Pawn pawn = move.pawn();
        int steps = move.steps();
        Cell target = pawn.findTargetCell(steps, config);
        if (target == null) return -1;

        boolean killsEnemy = pawn.getState() != Pawn.State.HOMER
                && target.getPawn() != null
                && !target.getPawn().getPlayer().equals(player);

        Player enemy = killsEnemy ? target.getPawn().getPlayer() : null;

        boolean entersHome = pawn.getState() == Pawn.State.FIELDER
                && target.getCellType() == Cell.CellType.HOME;

        Cell source = pawn.getCell();
        boolean onEnemyCorner = source.getCellType() == Cell.CellType.CORNER
                && !source.getOwner().equals(player);
        boolean onOwnCorner = source.getCellType() == Cell.CellType.CORNER
                && source.getOwner().equals(player);

        if (isWinningMove(player, pawn, steps, config)) return 1_000_000;
        if (killsEnemy && isEnemyLastFieldPawn(enemy, config)) return 900_000;
        if (killsEnemy) return 800_000;
        if (entersHome) return 700_000;
        if (onEnemyCorner) return 600_000;
        if (onOwnCorner) return 500_000;

        int maxDistance = config.fieldLength();
        int distance = calculateDistanceToHome(player, pawn, config);
        return 400_000 + (maxDistance - distance);
    }

    private boolean isWinningMove(Player player, Pawn pawn, int steps, GameConfig config) {
        if (pawn.getState() == Pawn.State.HOMER) return false;
        Cell target = pawn.findTargetCell(steps, config);
        if (target == null || target != player.getCorner()) return false;
        return player.getPawns().stream()
                .filter(p -> p != pawn && p.getState() == HOMER)
                .count() == config.numberOfPawns() - 1;
    }

    private boolean isEnemyLastFieldPawn(Player enemy, GameConfig config) {
        if (enemy == null) return false;
        long homeCount = enemy.getPawns().stream()
                .filter(p -> p.getState() == HOMER)
                .count();
        long fieldCount = enemy.getPawns().stream()
                .filter(p -> p.getState() != HOMER && p.getState() != BENCH)
                .count();
        return homeCount == config.numberOfPawns() - 1 && fieldCount == 1;
    }

    private int calculateDistanceToHome(Player player, Pawn pawn, GameConfig config) {
        if (pawn.getState() == Pawn.State.HOMER) return 0;
        Cell current = pawn.getCell();
        if (current == player.getCorner()) return config.fieldLength();
        int distance = 0;
        while (current != player.getCorner() && distance < config.fieldLength()) {
            current = current.getNextFieldCell();
            distance++;
        }
        return distance;
    }
}
