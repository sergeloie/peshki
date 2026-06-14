package ru.anseranser.peshki.util;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Cell;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

import static ru.anseranser.peshki.MainConfig.sideLength;

public class RenderBoard {
    private static final String[] COLORS = {
        "\033[31m",
        "\033[32m",
        "\033[33m",
        "\033[34m",
    };
    private static final String RESET = "\033[0m";

    public static String[] renderBoard(Board board) {
        String[][] grid = new String[sideLength][sideLength];
        for (String[] row : grid) {
            Arrays.fill(row, "# ");
        }
        fillField(board, grid);
        fillHomeCells(board, grid);

        String[] lines = new String[sideLength];
        for (int i = 0; i < sideLength; i++) {
            lines[i] = String.join("", grid[i]);
        }
        return lines;
    }

    private static void fillField(Board board, String[][] grid) {
        List<Cell> sortedCorners = board.getCorners().values().stream()
                .sorted(Comparator.comparing(c -> c.getCornerOrHomeOwner().getPlayerNumber()))
                .toList();

        Cell cell = sortedCorners.get(0);

        for (int col = 0; col < sideLength; col++) {
            grid[0][col] = cellToColor(cell);
            cell = cell.getNextFieldCell();
        }

        for (int row = 1; row < sideLength; row++) {
            grid[row][sideLength - 1] = cellToColor(cell);
            cell = cell.getNextFieldCell();
        }

        for (int col = sideLength - 2; col >= 0; col--) {
            grid[sideLength - 1][col] = cellToColor(cell);
            cell = cell.getNextFieldCell();
        }

        for (int row = sideLength - 2; row >= 1; row--) {
            grid[row][0] = cellToColor(cell);
            cell = cell.getNextFieldCell();
        }
    }

    private static void fillHomeCells(Board board, String[][] grid) {
        List<Cell> sortedCorners = board.getCorners().values().stream()
                .sorted(Comparator.comparing(c -> c.getCornerOrHomeOwner().getPlayerNumber()))
                .toList();

        int[][] directions = {{1, 1}, {1, -1}, {-1, -1}, {-1, 1}};
        int[][] corners = {{0, 0}, {0, sideLength - 1}, {sideLength - 1, sideLength - 1}, {sideLength - 1, 0}};

        for (int i = 0; i < sortedCorners.size(); i++) {
            Cell homeCell = sortedCorners.get(i).getNextHomeCell();
            int row = corners[i][0];
            int col = corners[i][1];
            int dRow = directions[i][0];
            int dCol = directions[i][1];
            int step = 1;
            while (homeCell != null) {
                grid[row + dRow * step][col + dCol * step] = cellToColor(homeCell);
                homeCell = homeCell.getNextHomeCell();
                step++;
            }
        }
    }

    private static String cellToColor(Cell cell) {
        if (cell.getPawn() == null) return "# ";
        int playerNum = cell.getPawn().getPlayer().getPlayerNumber();
        return COLORS[playerNum - 1] + playerNum + RESET + " ";
    }

    public static void drawBoardsSideBySide(String[] before, String[] after) {
        System.out.println("  BEFORE" + " ".repeat(22) + "AFTER");
        for (int i = 0; i < before.length; i++) {
            System.out.println("  " + before[i] + "    " + after[i]);
        }
    }
}
