package ru.anseranser.peshki.engine;

import java.util.List;

/**
 * The single interface for choosing moves (ticket 08).
 * Implemented by the heuristic bot, by human adapters in UI modules,
 * and later by a trained neural network — all interchangeable mid-game.
 */
public interface MoveSelector {

    /**
     * @return the chosen move (must be one of {@code legalMoves}),
     * or {@code null} to pass
     */
    Move select(MoveContext context, List<Move> legalMoves);
}
