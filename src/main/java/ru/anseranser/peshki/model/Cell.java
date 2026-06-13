package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@RequiredArgsConstructor
@Getter
@Setter
public class Cell {

    public enum CellType {
        CORNER,
        FIELD,
        HOME
    }

    private final CellType cellType;
    private Cell nextFieldCell;
    private Cell nextHomeCell;
    private Player cornerOrHomeOwner;

    public Cell(CellType cellType, Player cornerOrHomeOwner) {
        this.cellType = cellType;
        this.cornerOrHomeOwner = cornerOrHomeOwner;
    }
}


