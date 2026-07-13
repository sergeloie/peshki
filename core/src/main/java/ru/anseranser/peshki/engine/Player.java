package ru.anseranser.peshki.engine;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static ru.anseranser.peshki.engine.Pawn.State.BENCH;

@Getter
@EqualsAndHashCode(of = "number")
public class Player {

    private final int number;
    private final GameConfig config;
    private final DiceRoller diceRoller;
    private final List<Pawn> pawns;
    private final PlayerColor color;
    private Cell corner;
    @Setter
    private boolean human;

    public Player(int number, GameConfig config) {
        this(number, config, new RandomDiceRoller(new Random()));
    }

    public Player(int number, GameConfig config, DiceRoller diceRoller) {
        this.number = number;
        this.config = config;
        this.diceRoller = diceRoller;
        this.color = PlayerColor.forIndex(number - 1);
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
        return Stream.generate(() -> diceRoller.roll(config.numberOfSidesOnDice()))
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
        if (pawn.getCell() == corner) return config.fieldLength();
        Cell current = corner.getNextFieldCell();
        int pos = 0;
        // The field ring contains fieldLength() field cells plus one corner per
        // player, so the full cycle back to the own corner is longer than
        // fieldLength(). A pawn may legitimately sit on a field cell (or even
        // another player's corner) far along the shared ring.
        int ringLength = config.fieldLength() + config.numberOfPlayers();
        while (pos < ringLength) {
            if (current == pawn.getCell()) return pos;
            current = current.getNextFieldCell();
            pos++;
        }
        throw new IllegalStateException(
                "Pawn " + pawn.getNumber() + " is not on the field ring of player " + number);
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
