package ru.anseranser.peshki.engine;

import java.util.Random;

/**
 * Default {@link DiceRoller} backed by {@link java.util.Random}.
 */
public class RandomDiceRoller implements DiceRoller {

    private final Random random;

    public RandomDiceRoller(Random random) {
        this.random = random;
    }

    @Override
    public int roll(int sides) {
        if (sides < 1) {
            throw new IllegalArgumentException("sides must be >= 1");
        }
        return random.nextInt(sides) + 1;
    }
}
