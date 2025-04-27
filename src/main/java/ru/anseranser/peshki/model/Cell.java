package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.Setter;
import ru.anseranser.peshki.enums.PlayerEnum;

@Getter
@Setter
public class Cell {
    private boolean isCorner;
    private PlayerEnum playersCorner;
    private int cellNumber;
    private int player1CellNumber;
    private int player2CellNumber;
    private int player3CellNumber;
    private int player4CellNumber;
    private Pawn pawn;
    private Cell nextCell;
    private Cell homeCell;
}
