package ru.anseranser.peshki;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Player;
import ru.anseranser.peshki.util.RenderBoard;

import java.util.List;

import static ru.anseranser.peshki.util.Dice.DropDices;

public class Main {
    public static void main(String[] args) {
        Board board = new Board();


        RenderBoard.drawBoard(board);

        System.out.println();
        board.getPlayers().stream().forEach(Player::putNewPawn);

/*        Player onePlayer = board.getPlayers().getFirst();
        onePlayer.putNewPawn();

        RenderBoard.drawBoard(board);

        Player threePlayer = board.getPlayers().get(2);
        threePlayer.putNewPawn();

        System.out.println();*/

        RenderBoard.drawBoard(board);

/*        for (int i = 0; i < 255; i++) {
            System.out.print((char) i + " ");
        }*/
    }
}
