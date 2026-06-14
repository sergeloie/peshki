package ru.anseranser.peshki.input;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Player;

import java.util.List;

public interface MoveInputService {
    Player.Move selectMove(Player player, List<Player.Move> availableMoves, Board board,
                            List<Integer> allDice, List<Integer> usedDice);
}
