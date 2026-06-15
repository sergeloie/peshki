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

    public int fieldLength() {
        return numberOfPlayers * (sideLength - 2);
    }

    public int homeLength() {
        return numberOfPawns - 1;
    }
}
