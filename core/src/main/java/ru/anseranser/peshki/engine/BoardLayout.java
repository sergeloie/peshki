package ru.anseranser.peshki.engine;

import java.util.List;

public final class BoardLayout {
    private BoardLayout() {}

    public static int[][] coordinates(Board board) {
        GameConfig config = board.getConfig();
        int size = config.sideLength();
        List<Cell> allCells = board.getAllCells();
        int[][] coords = new int[allCells.size()][2];
        int idx = 0;

        for (int x = 0; x < size; x++) { coords[idx][0] = x; coords[idx][1] = 0; idx++; }
        for (int y = 1; y < size; y++) { coords[idx][0] = size - 1; coords[idx][1] = y; idx++; }
        for (int x = size - 2; x >= 0; x--) { coords[idx][0] = x; coords[idx][1] = size - 1; idx++; }
        for (int y = size - 2; y >= 1; y--) { coords[idx][0] = 0; coords[idx][1] = y; idx++; }

        int[] cornerX = {0, size - 1, size - 1, 0};
        int[] cornerY = {0, 0, size - 1, size - 1};
        int[] dirX = {1, -1, -1, 1};
        int[] dirY = {1, 1, -1, -1};

        for (int pi = 0; pi < config.numberOfPlayers(); pi++) {
            Cell home = board.getCorner(pi).getNextHomeCell();
            int step = 1;
            while (home != null) {
                coords[idx][0] = cornerX[pi] + dirX[pi] * step;
                coords[idx][1] = cornerY[pi] + dirY[pi] * step;
                idx++;
                home = home.getNextHomeCell();
                step++;
            }
        }

        return coords;
    }
}
