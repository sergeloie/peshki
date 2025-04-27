package ru.anseranser.peshki;

import ru.anseranser.peshki.enums.PlayerEnum;
import ru.anseranser.peshki.model.GameBoard;
import ru.anseranser.peshki.model.Pawn;

public class Main {
    public static void main(String[] args) {
        GameBoard gameBoard = new GameBoard();
        String[][] bb = gameBoard.getBoard();
        bb[0][5] = "1";
        bb[0][15] = "1";
        bb[0][21] = "2";
        bb[3][1] = "1";
        bb[3][22] = "4";
        gameBoard.renderOutputBoard();

        Pawn pawn = Pawn.builder().player(PlayerEnum.PLAYER2).build();
        System.out.println(pawn);
        System.out.println(pawn.getPlayer().getValue());

        PlayerEnum p1 = PlayerEnum.PLAYER1;
        PlayerEnum p2 = PlayerEnum.PLAYER2;
        PlayerEnum p3 = PlayerEnum.PLAYER3;
        PlayerEnum p4 = PlayerEnum.PLAYER4;

        System.out.println(p1);
        System.out.println(p2);
        System.out.println(p3);
        System.out.println(p4);
    }
}
