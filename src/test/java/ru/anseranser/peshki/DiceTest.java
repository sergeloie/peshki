package ru.anseranser.peshki;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import ru.anseranser.peshki.util.Dice;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class DiceTest {

    @Test
    @Disabled
    void spreadTest() {
        long drops = 1_000_000;
        Map<Integer, Long> spread = IntStream
                .generate(Dice::DropDice)
                .limit(drops * 6)
                .boxed()
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        System.out.println(spread);
        Map<Integer, Double> spread2 = spread.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> (entry.getValue().doubleValue() - drops) / drops
                ));
        System.out.println(spread2);
    }
}
