package ru.anseranser.peshki.engine;

import java.util.Comparator;
import java.util.List;

/**
 * Computes (x, y) grid coordinates for every cell of a board from its
 * {@link GameConfig}. The board is a square of side {@code sideLength}; the
 * field ring is exactly the board perimeter and each player's home cells step
 * inward from that player's own corner. This replaces the previously hardcoded
 * 8x8 layout so the same engine can drive any grid size / any UI.
 */
public final class BoardLayout {

    private BoardLayout() {
    }

    public static int[][] coordinates(Board board) {
        GameConfig config = board.getPlayers().get(0).getConfig();
        int size = config.sideLength();
        List<Cell> allCells = board.getAllCells();
        int[][] coords = new int[allCells.size()][2];

        int idx = 0;
        // Top edge (left -> right): corner of player 1, fields, corner of player 2.
        for (int x = 0; x < size; x++) {
            coords[idx][0] = x;
            coords[idx][1] = 0;
            idx++;
        }
        // Right edge (top -> bottom, skip first): fields, corner of player 3.
        for (int y = 1; y < size; y++) {
            coords[idx][0] = size - 1;
            coords[idx][1] = y;
            idx++;
        }
        // Bottom edge (right -> left, skip last): fields, corner of player 4.
        for (int x = size - 2; x >= 0; x--) {
            coords[idx][0] = x;
            coords[idx][1] = size - 1;
            idx++;
        }
        // Left edge (bottom -> top, skip first and last): remaining fields.
        for (int y = size - 2; y >= 1; y--) {
            coords[idx][0] = 0;
            coords[idx][1] = y;
            idx++;
        }

        // Home cells: each player's chain steps inward from its own corner.
        List<Player> players = board.getPlayers().stream()
                .sorted(Comparator.comparing(Player::getNumber))
                .toList();
        int[] cornerX = {0, size - 1, size - 1, 0};
        int[] cornerY = {0, 0, size - 1, size - 1};
        int[] dirX = {1, -1, -1, 1};
        int[] dirY = {1, 1, -1, -1};
        for (Player p : players) {
            int pi = (p.getNumber() - 1) % 4;
            int r0 = cornerX[pi];
            int c0 = cornerY[pi];
            int dr = dirX[pi];
            int dc = dirY[pi];
            Cell home = board.getCorner(p).getNextHomeCell();
            int step = 1;
            while (home != null) {
                coords[idx][0] = r0 + dr * step;
                coords[idx][1] = c0 + dc * step;
                idx++;
                home = home.getNextHomeCell();
                step++;
            }
        }
        return coords;
    }
}
