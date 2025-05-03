package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.Setter;
import ru.anseranser.peshki.enums.Player;

@Getter
@Setter
public class Cell {
    private Player playersCorner;
    private boolean isHome;
    private int homeNumber;
    private int absolutePosition;
    private int relativePosition;
    private Pawn pawn;
    private Cell nextFieldCell;
    private Cell homeCell;

    public Cell getNextCellForPawn(Pawn pawn) {

    }
    
    public boolean isCorner() {
        return absolutePosition % 7 == 0;
    }

    public int getRelativePosition(Player player) {
        int offset = player.getValue();
        return (absolutePosition - offset + 28) % 28;
    }
}
