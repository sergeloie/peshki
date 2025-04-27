package ru.anseranser.peshki.model;

import lombok.Getter;

import java.util.Arrays;

@Getter
public class GameBoard {

    private final String[][] board;
    private final String[][] outputBoard;

    public GameBoard() {
        this.outputBoard = new String[8][8];
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                outputBoard[i][j] = " ";
            }

        }

        this.board = new String[4][29];
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 29; j++) {
                board[i][j] = "_";
            }

        }
    }

    private void mapOutputBoard() {
        outputBoard[0][0] = String.valueOf(board[0][1]);
        outputBoard[0][1] = String.valueOf(board[0][2]);
        outputBoard[0][2] = String.valueOf(board[0][3]);
        outputBoard[0][3] = String.valueOf(board[0][4]);
        outputBoard[0][4] = String.valueOf(board[0][5]);
        outputBoard[0][5] = String.valueOf(board[0][6]);
        outputBoard[0][6] = String.valueOf(board[0][7]);
        outputBoard[0][7] = String.valueOf(board[0][8]);
        outputBoard[1][7] = String.valueOf(board[0][9]);
        outputBoard[2][7] = String.valueOf(board[0][10]);
        outputBoard[3][7] = String.valueOf(board[0][11]);
        outputBoard[4][7] = String.valueOf(board[0][12]);
        outputBoard[5][7] = String.valueOf(board[0][13]);
        outputBoard[6][7] = String.valueOf(board[0][14]);
        outputBoard[7][7] = String.valueOf(board[0][15]);
        outputBoard[7][6] = String.valueOf(board[0][16]);
        outputBoard[7][5] = String.valueOf(board[0][17]);
        outputBoard[7][4] = String.valueOf(board[0][18]);
        outputBoard[7][3] = String.valueOf(board[0][19]);
        outputBoard[7][2] = String.valueOf(board[0][20]);
        outputBoard[7][1] = String.valueOf(board[0][21]);
        outputBoard[7][0] = String.valueOf(board[0][22]);
        outputBoard[6][0] = String.valueOf(board[0][23]);
        outputBoard[5][0] = String.valueOf(board[0][24]);
        outputBoard[4][0] = String.valueOf(board[0][25]);
        outputBoard[3][0] = String.valueOf(board[0][26]);
        outputBoard[2][0] = String.valueOf(board[0][27]);
        outputBoard[1][0] = String.valueOf(board[0][28]);


        outputBoard[1][1] = String.valueOf(board[1][1]);
        outputBoard[2][2] = String.valueOf(board[2][1]);
        outputBoard[3][3] = String.valueOf(board[3][1]);

        outputBoard[1][6] = String.valueOf(board[1][8]);
        outputBoard[2][5] = String.valueOf(board[2][8]);
        outputBoard[3][4] = String.valueOf(board[3][8]);

        outputBoard[6][6] = String.valueOf(board[1][15]);
        outputBoard[5][5] = String.valueOf(board[2][15]);
        outputBoard[4][4] = String.valueOf(board[3][15]);

        outputBoard[6][1] = String.valueOf(board[1][22]);
        outputBoard[5][2] = String.valueOf(board[2][22]);
        outputBoard[4][3] = String.valueOf(board[3][22]);

    }

    public void renderOutputBoard() {
        mapOutputBoard();
        Arrays.stream(outputBoard)
                .forEach(line -> System.out.println(Arrays.toString(line)));
    }
}
