package ru.anseranser.peshki.util;

import java.util.Random;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.MainConfig.numberOfDices;
import static ru.anseranser.peshki.MainConfig.numberOfSidesOnDice;

public class Dice {

    public static Random random = new Random();

    public static int DropDice() {
        return random.nextInt(1, numberOfSidesOnDice + 1);
    }

    public static int[] DropDices() {
        return IntStream
                .generate(Dice::DropDice)
                .limit(numberOfDices)
                .toArray();
    }
}
