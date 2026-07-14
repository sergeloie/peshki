package ru.anseranser.peshki.engine;

import java.util.List;

public record Move(
        int playerIndex,
        int pawnIndex,
        int steps,
        List<Integer> consumedDice,
        int targetCellIndex
) {}
