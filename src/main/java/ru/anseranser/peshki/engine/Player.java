package ru.anseranser.peshki.engine;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static ru.anseranser.peshki.engine.Pawn.State.BENCH;

@Getter
@EqualsAndHashCode(of = "number")
public class Player {

    private static final Random RANDOM = new Random();

    private final int number;
    private final List<Pawn> pawns;
    private Cell corner;
    @Setter
    private boolean human;

    public Player(int number, GameConfig config) {
        this.number = number;
        this.pawns = IntStream.rangeClosed(1, config.numberOfPawns())
                .mapToObj(i -> new Pawn(this, i))
                .toList();
    }

    public Cell getCorner() {
        return corner;
    }

    public void setCorner(Cell corner) {
        this.corner = corner;
    }

    public List<Integer> rollDice(GameConfig config) {
        return Stream.generate(() -> RANDOM.nextInt(1, config.numberOfSidesOnDice() + 1))
                .limit(config.numberOfDice())
                .toList();
    }

    public List<Pawn> getPawnsByState(Pawn.State... states) {
        return pawns.stream()
                .filter(p -> {
                    for (Pawn.State s : states) {
                        if (p.getState() == s) return true;
                    }
                    return false;
                })
                .toList();
    }

    public List<Pawn> getMovablePawns() {
        return getPawnsByState(Pawn.State.NEWBORN, Pawn.State.FIELDER, Pawn.State.HOMER);
    }

    public void renumber() {
        List<Pawn> sorted = pawns.stream()
                .sorted(Comparator.comparingInt(this::getProgress).reversed())
                .toList();
        for (int i = 0; i < sorted.size(); i++) {
            sorted.get(i).setNumber(i + 1);
        }
    }

    private int getProgress(Pawn pawn) {
        return switch (pawn.getState()) {
            case HOMER -> 1000 + getHomePosition(pawn);
            case FIELDER -> getFieldPosition(pawn);
            case NEWBORN -> -1;
            case BENCH -> -2;
        };
    }

    private int getFieldPosition(Pawn pawn) {
        Cell current = corner.getNextFieldCell();
        int pos = 0;
        int max = 100;
        while (current != corner && pos < 100) {
            if (current == pawn.getCell()) return pos;
            current = current.getNextFieldCell();
            pos++;
        }
        return -1;
    }

    private int getHomePosition(Pawn pawn) {
        Cell current = corner.getNextHomeCell();
        int pos = 0;
        while (current != null) {
            if (current == pawn.getCell()) return pos;
            current = current.getNextHomeCell();
            pos++;
        }
        return -1;
    }
}
