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
    private Pawn pawn;
    private Cell nextCell;
    private Cell homeCell;
}
