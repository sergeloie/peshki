package ru.anseranser.peshki.engine.event;

public sealed interface GameEvent {
    record DiceRolled(int playerNumber, java.util.List<Integer> values) implements GameEvent {}
    record PawnPlaced(int playerNumber, int pawnNumber, int cellIndex) implements GameEvent {}
    record PawnMoved(int playerNumber, int pawnNumber, int fromCell, int toCell, int steps) implements GameEvent {}
    record PawnKilled(int killerPlayer, int killerPawn, int victimPlayer, int victimPawn) implements GameEvent {}
    record EnteredHome(int playerNumber, int pawnNumber) implements GameEvent {}
    record TurnEnded(int playerNumber, boolean extraTurn) implements GameEvent {}
    record GameWon(int playerNumber) implements GameEvent {}
    record MoveRejected(String reason) implements GameEvent {}
}
