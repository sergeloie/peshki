package ru.anseranser.peshki.engine;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Pawn {

    public enum State { BENCH, NEWBORN, FIELDER, HOMER }

    private final Player player;
    private int number;
    private Cell cell;
    private State state;

    public Pawn(Player player, int number) {
        this.player = player;
        this.number = number;
        this.state = State.BENCH;
    }

    public Cell findTargetCell(int steps, GameConfig config) {
        Cell current = this.cell;
        Cell corner = player.getCorner();
        boolean inHome = this.state == State.HOMER;
        boolean isLastLapPawn = !inHome
                && player.getPawnsByState(State.HOMER).size() == config.numberOfPawns() - 1;

        for (int i = 0; i < steps; i++) {
            Cell next;

            if (!inHome) {
                if (current == corner && this.state == State.FIELDER) {
                    if (isLastLapPawn) {
                        return corner;
                    }
                    inHome = true;
                    next = current.getNextHomeCell();
                } else {
                    next = current.getNextFieldCell();
                    if (next == corner && !isLastLapPawn) {
                        inHome = true;
                    }
                }
            } else {
                next = current.getNextHomeCell();
            }

            if (next == null) return null;

            if (i < steps - 1 && next.getPawn() != null) return null;

            if (i == steps - 1 && next.getPawn() != null
                    && next.getPawn().getPlayer().equals(player)) return null;

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

        if (this.state == State.NEWBORN) {
            this.state = State.FIELDER;
        }
        if (this.state == State.FIELDER && targetCell.getCellType() == Cell.CellType.HOME) {
            this.state = State.HOMER;
        }
    }

    public void remove() {
        if (state == State.HOMER) {
            throw new IllegalStateException("Cannot remove pawn in home");
        }
        if (state == State.BENCH) {
            throw new IllegalStateException("Pawn already on bench");
        }
        cell.setPawn(null);
        setCell(null);
        setState(State.BENCH);
    }
}
