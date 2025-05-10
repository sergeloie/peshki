package ru.anseranser.peshki.model;

import ru.anseranser.peshki.enums.Player;

public class NewCell {
    private Player cornerOwner;
    private NewCell nextFieldCell;
    private NewCell nextHomeCell;
    private Pawn pawn;

    public boolean getCornerOwner() {
        return cornerOwner != null;
    }

    public NewCell getNextCell(Pawn pawn) {
        if (nextHomeCell == null) {
            return nextFieldCell;
        }

        if (nextFieldCell == null) {
            return nextHomeCell;
        }

        if (pawn.getPlayer().equals(cornerOwner)) {
            if (pawn.isNewBorn()) {
                return nextFieldCell;
            } else {
                return nextHomeCell;
            }
        } else {
            return nextFieldCell;
        }
    }
}
