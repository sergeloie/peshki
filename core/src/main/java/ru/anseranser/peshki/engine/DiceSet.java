package ru.anseranser.peshki.engine;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Rolled dice as a value object (ticket 07). Owns the only two dice
 * interpretations the rules allow: distinct single-die values and,
 * for exactly two dice, their sum.
 */
public final class DiceSet {

    private final List<Integer> dice;

    public DiceSet(List<Integer> dice) {
        this.dice = List.copyOf(dice);
    }

    public List<Integer> values() {
        return dice;
    }

    public boolean contains(int value) {
        return dice.contains(value);
    }

    public List<Integer> distinctValues() {
        return new ArrayList<>(new LinkedHashSet<>(dice));
    }

    public boolean hasPairSum() {
        return dice.size() == 2;
    }

    public int pairSum() {
        if (!hasPairSum()) {
            throw new IllegalStateException("Sum is only defined for exactly two dice");
        }
        return dice.get(0) + dice.get(1);
    }

    public List<Integer> withoutOne(int value) {
        List<Integer> rest = new ArrayList<>(dice);
        rest.remove(Integer.valueOf(value));
        return rest;
    }
}
