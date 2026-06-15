package ru.anseranser.peshki.engine;

import java.util.List;

public record Move(Pawn pawn, int steps, List<Integer> consumedDice) {}
