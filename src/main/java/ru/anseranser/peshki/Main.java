package ru.anseranser.peshki;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.util.RenderBoard;

import java.util.List;

import static ru.anseranser.peshki.util.Dice.DropDices;

public class Main {
    public static void main(String[] args) {
        Board board = new Board();


        RenderBoard.drawBoard(board);

        System.out.println();

        for (int i = 0; i < 255; i++) {
            System.out.print((char) i + " ");
        }
    }
}
