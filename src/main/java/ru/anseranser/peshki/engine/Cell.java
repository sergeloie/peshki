package ru.anseranser.peshki.engine;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Cell {

    public enum CellType { CORNER, FIELD, HOME }

    private final CellType cellType;
    private Cell nextFieldCell;
    private Cell nextHomeCell;
    private final Player owner;
    private Pawn pawn;

    public Cell(CellType cellType) {
        this(cellType, null);
    }

    public Cell(CellType cellType, Player owner) {
        this.cellType = cellType;
        this.owner = owner;
    }
}
