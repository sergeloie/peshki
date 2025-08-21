package ru.anseranser.peshki.util;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Cell;

import java.util.Collection;
import java.util.List;

import static ru.anseranser.peshki.MainConfig.sideLength;

//Реализация вывода игровой доски, для стандартной шахматной доски в консоль
public class RenderBoard {

    public static void drawBoard(Board board) {
        char[][] chessBoard = new char[sideLength + 2][sideLength + 2];
        fillCorners(board, chessBoard);
        printCharMatrix(chessBoard, 1, 1);
    }

    private static void fillCorners(Board board, char[][] matrix) {

        List<Cell> corners = board.getCorners().values().stream().toList();
        matrix[1][1] = corners.get(0).getPawn() == null ? '#' : (char) (corners.get(0).getPawn().getPlayer().getPlayerNumber() - '0');
        matrix[1][8] = corners.get(1).getPawn() == null ? '#' : (char) (corners.get(1).getPawn().getPlayer().getPlayerNumber() - '0');
        matrix[8][8] = corners.get(2).getPawn() == null ? '#' : (char) (corners.get(2).getPawn().getPlayer().getPlayerNumber() - '0');
        matrix[8][1] = corners.get(3).getPawn() == null ? '#' : (char) (corners.get(3).getPawn().getPlayer().getPlayerNumber() - '0');
    }

    public static void printCharMatrix(char[][] matrix, int hSpacing, int vSpacing) {
        if (matrix == null || matrix.length == 0) {
            System.out.println("(empty matrix)");
            return;
        }

        String horizontalSpace = " ".repeat(Math.max(0, hSpacing));
        String verticalSpace = "\n".repeat(Math.max(0, vSpacing));

        for (char[] row : matrix) {
            for (int j = 0; j < row.length; j++) {
                System.out.print(row[j]);
                if (j < row.length - 1) {
                    System.out.print(horizontalSpace);
                }
            }
            System.out.print(verticalSpace);
        }
    }
}
