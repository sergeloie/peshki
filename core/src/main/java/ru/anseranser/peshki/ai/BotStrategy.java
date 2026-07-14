package ru.anseranser.peshki.ai;

import ru.anseranser.peshki.engine.*;

import java.util.Comparator;
import java.util.List;

public class BotStrategy {

    public Move selectBestMove(int playerIndex, List<Move> availableMoves,
                               GameConfig config, Board board) {
        return availableMoves.stream()
                .max(Comparator.comparingInt(m -> scoreMove(playerIndex, m, config, board)))
                .orElse(null);
    }

    private int scoreMove(int playerIndex, Move move, GameConfig config, Board board) {
        if (move.pawnIndex() == -1) {
            Cell cornerCell = board.getCorner(playerIndex);
            if (cornerCell.isOccupied() && cornerCell.getOccupantPlayerIndex() != playerIndex) {
                return 800_000;
            }
            return 100_000;
        }

        int ppi = move.pawnIndex();
        Cell target = board.findTargetCell(playerIndex, ppi, move.steps());
        if (target == null) return -1;

        boolean killsEnemy = !board.isHome(playerIndex, ppi)
                && target.isOccupied()
                && target.getOccupantPlayerIndex() != playerIndex;

        int enemyIndex = killsEnemy ? target.getOccupantPlayerIndex() : -1;

        boolean entersHome = board.isFielder(playerIndex, ppi)
                && target.getCellType() == Cell.CellType.HOME;

        Cell source = board.getPawnCell(playerIndex, ppi) >= 0
                ? board.getAllCells().get(board.getPawnCell(playerIndex, ppi)) : null;
        boolean onEnemyCorner = source != null
                && source.getCellType() == Cell.CellType.CORNER
                && source.getOwnerPlayerIndex() != playerIndex;
        boolean onOwnCorner = source != null
                && source.getCellType() == Cell.CellType.CORNER
                && source.getOwnerPlayerIndex() == playerIndex;

        if (isWinningMove(playerIndex, ppi, move.steps(), config, board)) return 1_000_000;
        if (killsEnemy && isEnemyLastFieldPawn(enemyIndex, config, board)) return 900_000;
        if (killsEnemy) return 800_000;
        if (entersHome) return 700_000;
        if (onEnemyCorner) return 600_000;
        if (onOwnCorner) return 500_000;

        int maxDistance = config.fieldLength();
        int distance = calculateDistanceToHome(playerIndex, ppi, config, board);
        return 400_000 + (maxDistance - distance);
    }

    private boolean isWinningMove(int playerIndex, int ppi, int steps,
                                  GameConfig config, Board board) {
        if (board.isHome(playerIndex, ppi)) return false;
        Cell target = board.findTargetCell(playerIndex, ppi, steps);
        if (target == null || target != board.getCorner(playerIndex)) return false;
        return board.countHomerPawns(playerIndex) == config.numberOfPawns() - 1;
    }

    private boolean isEnemyLastFieldPawn(int enemyIndex, GameConfig config, Board board) {
        if (enemyIndex < 0) return false;
        long homeCount = board.countHomerPawns(enemyIndex);
        long fieldCount = 0;
        for (int i = 0; i < config.numberOfPawns(); i++) {
            if (board.isFielder(enemyIndex, i)) fieldCount++;
        }
        return homeCount == config.numberOfPawns() - 1 && fieldCount == 1;
    }

    private int calculateDistanceToHome(int playerIndex, int ppi, GameConfig config, Board board) {
        if (board.isHome(playerIndex, ppi)) return 0;
        int cellIndex = board.getPawnCell(playerIndex, ppi);
        if (cellIndex < 0) return config.fieldLength();
        Cell current = board.getAllCells().get(cellIndex);
        Cell corner = board.getCorner(playerIndex);
        if (current == corner) return config.fieldLength();
        int distance = 0;
        int ringLength = config.fieldLength() + config.numberOfPlayers();
        while (current != corner && distance < ringLength) {
            current = current.getNextFieldCell();
            distance++;
        }
        return distance;
    }
}
