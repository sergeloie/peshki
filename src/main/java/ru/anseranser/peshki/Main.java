package ru.anseranser.peshki;

import ru.anseranser.peshki.ArrRealisation.ArrDraft;
import ru.anseranser.peshki.enums.Player;
import ru.anseranser.peshki.model.GameBoard;
import ru.anseranser.peshki.model.Pawn;

public class Main {
    public static void main(String[] args) {
//        GameBoard gameBoard = new GameBoard();
//        String[][] bb = gameBoard.getBoard();
//        bb[0][5] = "1";
//        bb[0][15] = "1";
//        bb[0][21] = "2";
//        bb[3][1] = "1";
//        bb[3][22] = "4";
//        gameBoard.renderOutputBoard();
//
//        Pawn pawn = Pawn.builder().player(Player.PLAYER2).build();
//        System.out.println(pawn);
//        System.out.println(pawn.getPlayer().getValue());
//
//        Player p1 = Player.PLAYER1;
//        Player p2 = Player.PLAYER2;
//        Player p3 = Player.PLAYER3;
//        Player p4 = Player.PLAYER4;
//
//        System.out.println(p1);
//        System.out.println(p2);
//        System.out.println(p3);
//        System.out.println(p4);

        ArrDraft arrDraft = new ArrDraft();
        arrDraft.getField()[0][0] = 105;
        arrDraft.getField()[0][6] = 227;
        arrDraft.getField()[2][14] = 330;
        arrDraft.getField()[2][13] = 330;
        arrDraft.printFieldInline();
    }
}
