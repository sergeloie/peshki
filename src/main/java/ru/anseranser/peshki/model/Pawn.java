package ru.anseranser.peshki.model;

import lombok.Getter;
import lombok.Setter;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;
import static ru.anseranser.peshki.model.Pawn.PawnState.BENCH;
import static ru.anseranser.peshki.model.Pawn.PawnState.HOMER;

@Getter
@Setter
public class Pawn {

    public enum PawnState {
        BENCH,
        NEWBORN,
        FIELDER,
        HOMER
    }

    private final Player player;
    private int number;
    private Cell cell;
    private PawnState state;

    public Pawn(Player player, int number) {
        this.player = player;
        this.number = number;
        this.state = BENCH;
    }

    public void remove() {
        if (state == HOMER) {
            throw new RuntimeException("Can not remove pawn in home area");
        }
        if (state == BENCH) {
            throw new RuntimeException("Pawn already has BENCH status");
        }
        cell.setPawn(null);
        setCell(null);
        setState(BENCH);
    }

    public Cell findTargetCell(int steps) {
        Cell current = this.cell;
        Cell corner = player.getCorner();
        boolean inHome = this.state == PawnState.HOMER;
        boolean isLastLapPawn = !inHome
                && player.getPawnsByState(PawnState.HOMER).size() == numberOfPawns - 1;

        for (int i = 0; i < steps; i++) {
            Cell next;

            if (!inHome) {
                if (current == corner && this.state == PawnState.FIELDER) {
                    if (isLastLapPawn) {
                        return corner;
                    }
                    inHome = true;
                    next = current.getNextHomeCell();
                } else {
                    next = current.getNextFieldCell();
                    if (next == corner && !isLastLapPawn) {
                        inHome = true;
                    } else if (next == corner) {
                        if (i < steps - 1) {
                            return null;
                        }
                    }
                }
            } else {
                next = current.getNextHomeCell();
            }

            if (next == null) {
                return null;
            }

            if (i < steps - 1 && next.getPawn() != null) {
                return null;
            }

            if (i == steps - 1 && next.getPawn() != null
                    && next.getPawn().getPlayer().equals(player)) {
                return null;
            }

            current = next;
        }

        return current;
    }

    public void moveTo(Cell targetCell) {
        if (this.cell != null) {
            this.cell.setPawn(null);
        }
        targetCell.setPawn(this);
        this.cell = targetCell;

        if (this.state == PawnState.NEWBORN) {
            this.state = PawnState.FIELDER;
        }

        if (this.state == PawnState.FIELDER && targetCell.getCellType() == Cell.CellType.HOME) {
            this.state = PawnState.HOMER;
        }
    }
}
