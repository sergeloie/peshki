package ru.anseranser.peshki.input;

import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;

import java.util.List;

public interface InputService {
    MoveCommand getMove(GameState state, List<Move> availableMoves,
                        List<Integer> allDice, List<Integer> usedDice, GameConfig config);
}
