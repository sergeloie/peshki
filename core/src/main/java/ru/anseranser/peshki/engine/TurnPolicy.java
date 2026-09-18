package ru.anseranser.peshki.engine;

import java.util.List;

/**
 * The extra-turn rule in exactly one place (ticket 07):
 * a 6 on the dice or a kill grants another turn.
 */
public final class TurnPolicy {

    private TurnPolicy() {}

    public static boolean grantsExtraTurn(List<Integer> dice, boolean killedEnemy) {
        return killedEnemy || dice.contains(6);
    }
}
