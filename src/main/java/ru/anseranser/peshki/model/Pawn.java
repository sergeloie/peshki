package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.Setter;
import ru.anseranser.peshki.enums.PawnState;

import static ru.anseranser.peshki.enums.PawnState.*;


@Getter
@Setter
public class Pawn {
    private final Player player;
    private Cell cell;
    private PawnState state;

    public Pawn(Player player) {
        this.player = player;
        this.state = BENCH;
    }

    public void remove() {
        if (state == HOMER || state == FINISHER) {
            throw new RuntimeException("Can not remove pawn in home area");
        }
        if (state == BENCH) {
            throw new RuntimeException("Pawn already has BENCH status");
        }
        cell.setPawn(null);
        setCell(null);
        setState(BENCH);
    }


    //TODO Move to defined cell
    public Cell movePawn(Cell cell) {
        return null;
    }

    // TODO Move "moveLength" steps ahead
    public Cell movePawn(int moveLength) {
        return null;
    }
}
