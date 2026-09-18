package ru.anseranser.peshki.engine;

/**
 * Marker for a pawn. Identity = index in the player's pawn list (stable
 * for the whole game, see ticket 04). Position and moved-flag live in
 * {@link Position} — the single source of truth, not here.
 */
public class Pawn {

    public enum State { BENCH, NEWBORN, FIELDER, HOMER }
}
