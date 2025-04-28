package ru.anseranser.peshki.Cells;

import ru.anseranser.peshki.enums.CellType;
import ru.anseranser.peshki.enums.Player;

public class FieldCell implements CommonCell{

    private int absolutePosition;

    @Override
    public CellType getCellType() {
        return CellType.FIELD;
    }

    @Override
    public int getAbsolutePosition() {
        return absolutePosition;
    }

    @Override
    public int getRelativePosition(Player player) {
        int offset = player.getValue();
        return (absolutePosition - offset + 28) % 28;
    }
}
