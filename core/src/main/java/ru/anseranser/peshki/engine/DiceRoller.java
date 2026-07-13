package ru.anseranser.peshki.engine;

/**
 * Abstraction over dice rolling. Injectable so the game can be made deterministic
 * in tests and so the RNG is not a global static (important for save/restore and fairness).
 */
public interface DiceRoller {

    /**
     * @param sides number of sides on the die (must be >= 1)
     * @return a value in the inclusive range [1, sides]
     */
    int roll(int sides);
}
