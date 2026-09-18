package ru.anseranser.peshki.engine;

/**
 * Stable pawn identity (ticket 09). The index never changes during a game —
 * captures and placements only change the {@link Position}, never the order.
 */
public record PawnId(int playerIndex, int pawnIndex) {}
