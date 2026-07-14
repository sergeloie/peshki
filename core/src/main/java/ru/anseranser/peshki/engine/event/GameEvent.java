package ru.anseranser.peshki.engine.event;

import java.util.List;

public sealed interface GameEvent {
    record DiceRolled(int playerIndex, List<Integer> values) implements GameEvent {}
    record PawnPlaced(int playerIndex, int pawnIndex, int cellIndex) implements GameEvent {}
    record PawnMoved(int playerIndex, int pawnIndex, int fromCell, int toCell, int steps) implements GameEvent {}
    record PawnKilled(int killerPlayerIndex, int killerPawnIndex, int victimPlayerIndex, int victimPawnIndex) implements GameEvent {}
    record EnteredHome(int playerIndex, int pawnIndex) implements GameEvent {}
    record TurnEnded(int playerIndex, boolean extraTurn) implements GameEvent {}
    record GameWon(int playerIndex) implements GameEvent {}
    record MoveRejected(String reason) implements GameEvent {}
}
