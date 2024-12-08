package ru.anseranser.peshki;

import ru.anseranser.peshki.model.GameBoard;

public class Main {
    public static void main(String[] args) {
        GameBoard gameBoard = new GameBoard();
        int[][] bb = gameBoard.getBoard();
        bb[0][5] = 1;
        bb[0][15] = 1;
        bb[0][21] = 2;
        bb[3][1] = 1;
        bb[3][22] = 4;
        gameBoard.renderOutputBoard();
    }
}
