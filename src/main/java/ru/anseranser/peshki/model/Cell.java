package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import ru.anseranser.peshki.enums.CellType;

import static ru.anseranser.peshki.enums.PawnState.*;

@RequiredArgsConstructor
@Getter
@Setter
public class Cell {
    private final CellType cellType;
    private Cell nextFieldCell;
    private Cell nextHomeCell;
    private Player cornerOrHomeOwner;
    private Pawn pawn;

    public Cell(CellType cellType, Player cornerOrHomeOwner) {
        this.cellType = cellType;
        this.cornerOrHomeOwner = cornerOrHomeOwner;
    }


    /* В зависимости от игрока вернуть следующую клетку. Актуально для ситуаций:
    1) Пешка только встала на свой угол
    2) Пешка прошла круг и попадает на свой или чужой угол
     */
    public Cell getNextCell(Pawn pawn) {

        //Если пешка только встала на свой угол, то для неё следующая клетка - полевая
        if (pawn.getState() == NEWBORN) {
            return nextFieldCell;
        }

        //Если текущая клетка - полевая, то вернуть следующую полевую клетку
        if (this.cellType == CellType.FIELD) {
            return nextFieldCell;
        }

        //Если текущая клетка - угол, то вернуть домашнюю, если угол принадлежит игроку, иначе, вернуть полевую
        if (this.cellType == CellType.CORNER && this.cornerOrHomeOwner.equals(pawn.getPlayer())) {
            return nextHomeCell;
        }
        return nextFieldCell;
    }

    public Pawn replacePawn(Pawn replacement) {

        if (this.pawn != null) {
            if (this.pawn.getPlayer().equals(replacement.getPlayer())) {
                throw new RuntimeException("This cell already occupied by your pawn player " + this.getPawn().getPlayer().getPlayerNumber());
            } else {
                this.pawn.remove();
            }
        }
        replacement.setCell(this);
        setPawn(replacement);
        return replacement;
    }
}

