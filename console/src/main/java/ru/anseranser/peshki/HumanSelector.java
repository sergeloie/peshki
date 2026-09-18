package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.MoveContext;
import ru.anseranser.peshki.engine.MoveSelector;
import ru.anseranser.peshki.input.InputService;

import java.util.ArrayList;
import java.util.List;

/**
 * Human controller for blocking UIs (console): asks the player
 * through {@link InputService} on every selection. Stateless —
 * the turn context (dice used so far) derives from the remaining dice.
 */
public class HumanSelector implements MoveSelector {

    private final InputService input;

    public HumanSelector(InputService input) {
        this.input = input;
    }

    @Override
    public Move select(MoveContext context, List<Move> legalMoves) {
        GameState state = context.state();
        List<Integer> allDice = context.dice().values();
        List<Integer> usedDice = withoutAll(allDice, context.remainingDice());
        return input.getMove(state, legalMoves, allDice, usedDice, state.config());
    }

    private static List<Integer> withoutAll(List<Integer> all, List<Integer> remaining) {
        List<Integer> used = new ArrayList<>(all);
        for (int d : remaining) {
            used.remove(Integer.valueOf(d));
        }
        return used;
    }
}
