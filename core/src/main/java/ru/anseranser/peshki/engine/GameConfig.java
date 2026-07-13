package ru.anseranser.peshki.engine;

public record GameConfig(
        int sideLength,
        int numberOfPlayers,
        int numberOfPawns,
        int numberOfDice,
        int numberOfSidesOnDice,
        int maxTurns
) {
    public static final GameConfig DEFAULT = new GameConfig(8, 4, 4, 2, 6, 5000);

    public GameConfig {
        if (sideLength < 2) {
            throw new IllegalArgumentException("sideLength must be >= 2");
        }
        if (numberOfPlayers < 2 || numberOfPlayers > 4) {
            throw new IllegalArgumentException("numberOfPlayers must be between 2 and 4");
        }
        if (numberOfPawns < 1) {
            throw new IllegalArgumentException("numberOfPawns must be >= 1");
        }
        if (numberOfDice < 1) {
            throw new IllegalArgumentException("numberOfDice must be >= 1");
        }
        if (numberOfSidesOnDice < 1) {
            throw new IllegalArgumentException("numberOfSidesOnDice must be >= 1");
        }
        if (maxTurns < 1) {
            throw new IllegalArgumentException("maxTurns must be >= 1");
        }
    }

    public int fieldLength() {
        return numberOfPlayers * (sideLength - 2);
    }

    public int homeLength() {
        return numberOfPawns - 1;
    }
}
