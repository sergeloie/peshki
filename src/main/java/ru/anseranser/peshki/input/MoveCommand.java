package ru.anseranser.peshki.input;

import java.util.List;

public sealed interface MoveCommand {
    record PlacePawn(int playerNumber, int diceValue) implements MoveCommand {}
    record MovePawn(int playerNumber, int pawnNumber, int steps, List<Integer> consumedDice) implements MoveCommand {}
    record PlaceAndMove(int playerNumber, int placeDice, int moveDice) implements MoveCommand {}
}
