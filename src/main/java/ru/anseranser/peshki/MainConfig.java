package ru.anseranser.peshki;

import java.util.HashMap;
import java.util.Map;

public class MainConfig {

    public static final int sideLength = 8;
    public static final int numberOfPlayers = 4;
    public static final int numberOfPawns = 4;
    public static final int numberOfDices = 2;
    public static final int numberOfSidesOnDice = 6;

    public static final Map<Integer, Integer> cornersCoordinate = calculateCornersCoordinate();

    public static Map<Integer, Integer> calculateCornersCoordinate() {
        Map<Integer, Integer> result = new HashMap<>();
        for (int player = 1; player <= numberOfPlayers; player++) {
            int coordinate = sideLength * (player - 1) - (player - 2);
            result.put(player, coordinate);
        }
        return result;
    }

}
