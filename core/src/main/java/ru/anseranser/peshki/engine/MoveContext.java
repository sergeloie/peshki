package ru.anseranser.peshki.engine;

import java.util.List;

/**
 * Everything a move selector needs for one decision (ticket 08):
 * the immutable board snapshot plus the dice context.
 * Bots read {@code board}; humans also read {@code state} for display.
 */
public record MoveContext(
        GameState state,
        PositionView board,
        DiceSet dice,
        List<Integer> remainingDice
) {}
