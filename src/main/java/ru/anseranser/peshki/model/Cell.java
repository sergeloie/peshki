package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.Setter;
import ru.anseranser.peshki.enums.Player;

@Getter
@Setter
public class Cell {
    private boolean isHome;
    private Player whoseHomeCell;
    private int homeNumber;
    private int absolutePosition;
    private int relativePosition;
    private Pawn pawn;
    private Cell nextFieldCell;
    private Cell nextHomeCell;

    public Cell getNextCellForPawn(Pawn pawn) {
/*        if (nextHomeCell == null) {
            return nextFieldCell;
        }
        if (nextHomeCell.getWhoseHomeCell().equals(pawn.getPlayer()) && !pawn.isNewBorn()) {
            return nextHomeCell;
        } else {
            return nextFieldCell;
        }*/
        if (nextHomeCell != null
                && nextHomeCell.getWhoseHomeCell().equals(pawn.getPlayer())
                && !pawn.isNewBorn()) {
            return nextHomeCell;
        } else {
            return nextFieldCell;
        }
    }

    public boolean isCorner() {
        return absolutePosition % 7 == 0;
    }

    public Player whoseCorner() {
        return switch (absolutePosition) {
            case 0 -> Player.PLAYER1;
            case 7 -> Player.PLAYER2;
            case 14 -> Player.PLAYER3;
            case 21 -> Player.PLAYER4;
            default -> throw new IllegalStateException("Not corner cell: " + absolutePosition);
        };
    }

    public int getRelativePosition(Player player) {
        int offset = player.getValue();
        return (absolutePosition - offset + 28) % 28;
    }
}
