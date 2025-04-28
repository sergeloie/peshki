package ru.anseranser.peshki.Cells;

import ru.anseranser.peshki.enums.CellType;
import ru.anseranser.peshki.enums.Player;

public interface CommonCell {
    CellType getCellType();
    int getAbsolutePosition();
    int getRelativePosition(Player player);
}
