package ru.anseranser.peshki.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@RequiredArgsConstructor
@Getter
@Setter
public class Pawn {
    private final Player player;
    private Cell cell;
    private Boolean isNewBorn;


    //TODO Move to defined cell
    public Cell movePawn(Cell cell) {
        return null;
    }

    // TODO Move "moveLength" steps ahead
    public Cell movePawn(int moveLength) {
        return null;
    }
}
