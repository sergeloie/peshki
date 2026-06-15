package ru.anseranser.peshki.ui.console;

import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.Cell;
import ru.anseranser.peshki.engine.Player;

import java.util.Comparator;
import java.util.List;

public class BoardRenderer {

    private static final String[] COLORS = {
            "\033[31m", "\033[32m", "\033[33m", "\033[34m"
    };
    private static final String RESET = "\033[0m";

    public static String[] render(Board board) {
        int size = 8;
        String[][] grid = new String[size][size];
        for (String[] row : grid) {
            java.util.Arrays.fill(row, "# ");
        }

        List<Player> sortedPlayers = board.getPlayers().stream()
                .sorted(Comparator.comparing(Player::getNumber))
                .toList();

        Cell startCorner = board.getCorner(sortedPlayers.get(0));
        Cell current = startCorner;

        // Top row (left to right)
        for (int col = 0; col < size; col++) {
            grid[0][col] = cellToString(current);
            current = current.getNextFieldCell();
        }

        // Right column (top to bottom, skip first)
        for (int row = 1; row < size; row++) {
            grid[row][size - 1] = cellToString(current);
            current = current.getNextFieldCell();
        }

        // Bottom row (right to left, skip last)
        for (int col = size - 2; col >= 0; col--) {
            grid[size - 1][col] = cellToString(current);
            current = current.getNextFieldCell();
        }

        // Left column (bottom to top, skip first and last)
        for (int row = size - 2; row >= 1; row--) {
            grid[row][0] = cellToString(current);
            current = current.getNextFieldCell();
        }

        // Home cells
        int[][] directions = {{1, 1}, {1, -1}, {-1, -1}, {-1, 1}};
        int[][] corners = {{0, 0}, {0, size - 1}, {size - 1, size - 1}, {size - 1, 0}};

        for (int i = 0; i < sortedPlayers.size(); i++) {
            Cell homeCell = board.getCorner(sortedPlayers.get(i)).getNextHomeCell();
            int row = corners[i][0];
            int col = corners[i][1];
            int dRow = directions[i][0];
            int dCol = directions[i][1];
            int step = 1;
            while (homeCell != null) {
                grid[row + dRow * step][col + dCol * step] = cellToString(homeCell);
                homeCell = homeCell.getNextHomeCell();
                step++;
            }
        }

        String[] lines = new String[size];
        for (int i = 0; i < size; i++) {
            lines[i] = String.join("", grid[i]);
        }
        return lines;
    }

    private static String cellToString(Cell cell) {
        if (cell.getPawn() == null) return "# ";
        int playerNum = cell.getPawn().getPlayer().getNumber();
        return COLORS[playerNum - 1] + playerNum + RESET + " ";
    }

}
