package ru.anseranser.peshki.input;

import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.Player;

import java.util.List;

public interface InputService {
    MoveCommand getMove(Player player, List<Move> availableMoves, Board board,
                        List<Integer> allDice, List<Integer> usedDice, GameConfig config);
}
