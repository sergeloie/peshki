package ru.anseranser.peshki.Cells;

import ru.anseranser.peshki.enums.CellType;
import ru.anseranser.peshki.enums.Player;

public class CornerCell implements CommonCell{

    private Player cornerOwner;

    @Override
    public CellType getCellType() {
        return CellType.CORNER;
    }

    @Override
    public int getAbsolutePosition() {
        return cornerOwner.getValue();
    }

    @Override
    public int getRelativePosition(Player player) {
        int offset = player.getValue();
        return (cornerOwner.getValue() - offset + 28) % 28;
    }
}
