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
    private Cell corner;

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
        Cell cornerCell = board.getCorners().get(this);
        Pawn pawn = getBenchPawn();
        cornerCell.setPawn(pawn);
        pawn.setCell(cornerCell);
        pawn.setState(Pawn.PawnState.NEWBORN);
        return pawn;
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

    public List<Pawn> getPawnsByState(Pawn.PawnState... states) {
        return pawns.stream()
                .filter(pawn -> {
                    for (Pawn.PawnState state : states) {
                        if (pawn.getState() == state) return true;
                    }
                    return false;
                })
                .toList();
    }

    public boolean tryPlaceNewPawn() {
        Pawn existingPawn = corner.getPawn();

        if (existingPawn != null && existingPawn.getPlayer().equals(this)) {
            return false;
        }

        if (getPawnsByState(BENCH).isEmpty()) {
            return false;
        }

        if (existingPawn != null) {
            existingPawn.remove();
        }

        putNewPawn();
        return true;
    }

    public boolean tryMovePawns(List<Integer> dice) {
        boolean kickedEnemy = false;
        for (int diceValue : dice) {
            List<Pawn> moveablePawns = getPawnsByState(
                    Pawn.PawnState.NEWBORN,
                    Pawn.PawnState.FIELDER,
                    Pawn.PawnState.HOMER);
            for (Pawn pawn : moveablePawns) {
                Cell targetCell = pawn.findTargetCell(diceValue);
                if (targetCell != null) {
                    if (pawn.getState() != Pawn.PawnState.HOMER
                            && targetCell.getPawn() != null
                            && !targetCell.getPawn().getPlayer().equals(this)) {
                        targetCell.getPawn().remove();
                        kickedEnemy = true;
                    }
                    pawn.moveTo(targetCell);
                    break;
                }
            }
        }
        return kickedEnemy;
    }

    public void setCorner(Cell corner) {
        this.corner = corner;
    }
}
