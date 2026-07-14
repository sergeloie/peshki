package ru.anseranser.peshki.input;

import java.util.List;

public sealed interface MoveCommand {
    record PlacePawn(int playerIndex, int diceValue) implements MoveCommand {}
    record MovePawn(int playerIndex, int pawnIndex, int steps, List<Integer> consumedDice) implements MoveCommand {}
    record PlaceAndMove(int playerIndex, int placeDice, int moveDice) implements MoveCommand {}
}
