package ru.anseranser.peshki.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;

import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static ru.anseranser.peshki.MainConfig.numberOfDices;
import static ru.anseranser.peshki.MainConfig.numberOfPawns;
import static ru.anseranser.peshki.MainConfig.numberOfSidesOnDice;
import static ru.anseranser.peshki.model.Pawn.PawnState.BENCH;

@Getter
@EqualsAndHashCode
public class Player {
    private static final Random random = new Random();

    private final Integer playerNumber;
    @EqualsAndHashCode.Exclude
    private final Board board;
    private final List<Pawn> pawns;
    private final Cell corner;

    //todo создание пешек должно быть здесь, в классе игрока
    public Player(int playerNumber, Board board) {
        this.playerNumber = playerNumber;
        this.board = board;
        this.pawns = IntStream.rangeClosed(1, numberOfPawns)
                .mapToObj(i -> new Pawn(this))
                .toList();
    }

    private Pawn getBenchPawn() {
        return pawns.stream()
                .filter(pawn -> pawn.getState() == BENCH)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No more BENCH pawns for player: " + this.playerNumber));
    }

    public Pawn putNewPawn() {
        Cell corner = board.getCorners().get(this);
        Pawn replacement = getBenchPawn();

    }

    private Integer DropDice() {
        return random.nextInt(1, numberOfSidesOnDice + 1);
    }

    public List<Integer> DropDices() {
        return Stream
                .generate(this::DropDice)
                .limit(numberOfDices)
                .toList();
    }

    private List<Pawn> getPawnsByState(Pawn.PawnState pawnState) {
        return pawns.stream()
                .filter(pawn -> pawn.getState() == pawnState)
                .toList();
    }
}
