package ru.anseranser.peshki.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;

import java.util.List;
import java.util.stream.IntStream;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;
import static ru.anseranser.peshki.enums.PawnState.BENCH;

@Getter
@EqualsAndHashCode
public class Player {
    private final int playerNumber;
    @EqualsAndHashCode.Exclude
    private final Board board;
    private final List<Pawn> pawns;

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
        return corner.replacePawn(replacement);
    }
}
