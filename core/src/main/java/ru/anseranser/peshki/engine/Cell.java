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
    private int occupantPlayerIndex = -1;
    private int occupantPawnIndex = -1;
    private int index;

    public Cell(CellType cellType) {
        this(cellType, -1);
    }

    public Cell(CellType cellType, int ownerPlayerIndex) {
        this.cellType = cellType;
        this.ownerPlayerIndex = ownerPlayerIndex;
    }

    public boolean isOccupied() {
        return occupantPlayerIndex != -1;
    }

    public void clearOccupant() {
        occupantPlayerIndex = -1;
        occupantPawnIndex = -1;
    }

    public void setOccupant(int playerIndex, int pawnIndex) {
        occupantPlayerIndex = playerIndex;
        occupantPawnIndex = pawnIndex;
    }
}
