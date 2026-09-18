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
    private final int ownerPlayerIndex;
    private int index;

    public Cell(CellType cellType) {
        this(cellType, -1);
    }

    public Cell(CellType cellType, int ownerPlayerIndex) {
        this.cellType = cellType;
        this.ownerPlayerIndex = ownerPlayerIndex;
    }
}
