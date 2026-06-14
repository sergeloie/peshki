package ru.anseranser.peshki.input;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Player;

import java.util.List;

public interface MoveInputService {
    boolean askPlacePawn(Player player, List<Integer> dice, Board board);
    Player.Move selectMove(Player player, List<Player.Move> availableMoves, Board board);
}
