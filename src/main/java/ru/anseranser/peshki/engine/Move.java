package ru.anseranser.peshki.engine;

import java.util.List;

/**
 * A candidate move. {@code targetCellIndex} lets any UI render the destination
 * (and detect kills/homes) without reaching into {@link Pawn}/{@link Cell}.
 */
public record Move(Pawn pawn, int steps, List<Integer> consumedDice, int targetCellIndex) {}
