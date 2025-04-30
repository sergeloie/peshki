package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.Setter;
import ru.anseranser.peshki.enums.Player;

@Getter
@Setter
public class Cell {
    private boolean isCorner;
    private Player playersCorner;
    private boolean isHome;
    private int homeNumber;
    private int cellNumber;
    private Pawn pawn;
    private Cell nextCell;
    private Cell homeCell;
}
