package ru.anseranser.peshki.util;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Cell;

import java.util.Comparator;
import java.util.List;

import static ru.anseranser.peshki.MainConfig.sideLength;

public class RenderBoard {

    public static void drawBoard(Board board) {
        char[][] grid = new char[sideLength][sideLength];
        for (char[] row : grid) {
            java.util.Arrays.fill(row, ' ');
        }
        fillField(board, grid);
        fillHomeCells(board, grid);
        printGrid(grid);
    }

    private static void fillField(Board board, char[][] grid) {
        List<Cell> sortedCorners = board.getCorners().values().stream()
                .sorted(Comparator.comparing(c -> c.getCornerOrHomeOwner().getPlayerNumber()))
                .toList();

        Cell cell = sortedCorners.get(0);

        for (int col = 0; col < sideLength; col++) {
            grid[0][col] = cellToChar(cell);
            cell = cell.getNextFieldCell();
        }

        for (int row = 1; row < sideLength; row++) {
            grid[row][sideLength - 1] = cellToChar(cell);
            cell = cell.getNextFieldCell();
        }

        for (int col = sideLength - 2; col >= 0; col--) {
            grid[sideLength - 1][col] = cellToChar(cell);
            cell = cell.getNextFieldCell();
        }

        for (int row = sideLength - 2; row >= 1; row--) {
            grid[row][0] = cellToChar(cell);
            cell = cell.getNextFieldCell();
        }
    }

    private static void fillHomeCells(Board board, char[][] grid) {
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
                grid[row + dRow * step][col + dCol * step] = cellToChar(homeCell);
                homeCell = homeCell.getNextHomeCell();
                step++;
            }
        }
    }

    private static char cellToChar(Cell cell) {
        if (cell.getPawn() == null) return '#';
        return (char) (cell.getPawn().getPlayer().getPlayerNumber() + '0');
    }

    private static void printGrid(char[][] grid) {
        for (char[] row : grid) {
            System.out.println(new String(row));
        }
    }
}
