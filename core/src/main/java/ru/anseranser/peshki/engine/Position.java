package ru.anseranser.peshki.engine;

/**
 * Single source of truth for "who stands where" (ticket 04, expand phase).
 *
 * <p>Holds, per pawn: the cell index ({@code -1} = bench) and whether the pawn
 * has ever moved (replaces the old {@code stepsTraveled > 0} check for NEWBORN).
 * Knows nothing about cells or rules — pure bookkeeping.
 */
public final class Position {

    private final BoardTopology topology;
    private final int[][] cell;
    private final boolean[][] moved;

    public Position(BoardTopology topology) {
        this.topology = topology;
        int players = topology.config().numberOfPlayers();
        int pawns = topology.config().numberOfPawns();
        this.cell = new int[players][pawns];
        this.moved = new boolean[players][pawns];
        clearAll();
    }

    /** Deep copy — snapshots for selectors must not observe live mutation. */
    public Position(Position other) {
        this.topology = other.topology;
        this.cell = new int[other.cell.length][];
        this.moved = new boolean[other.moved.length][];
        for (int i = 0; i < cell.length; i++) {
            this.cell[i] = other.cell[i].clone();
            this.moved[i] = other.moved[i].clone();
        }
    }

    public BoardTopology topology() {
        return topology;
    }

    public void clearAll() {
        for (int[] row : cell) {
            java.util.Arrays.fill(row, -1);
        }
        for (boolean[] row : moved) {
            java.util.Arrays.fill(row, false);
        }
    }

    public int cellOf(int playerIndex, int pawnIndex) {
        return cell[playerIndex][pawnIndex];
    }

    public void setCell(int playerIndex, int pawnIndex, int cellIndex) {
        cell[playerIndex][pawnIndex] = cellIndex;
    }

    public boolean isBench(int playerIndex, int pawnIndex) {
        return cell[playerIndex][pawnIndex] == -1;
    }

    public boolean hasMoved(int playerIndex, int pawnIndex) {
        return moved[playerIndex][pawnIndex];
    }

    public boolean isNewborn(int playerIndex, int pawnIndex) {
        return !isBench(playerIndex, pawnIndex) && !moved[playerIndex][pawnIndex];
    }

    public boolean isHome(int playerIndex, int pawnIndex) {
        if (isBench(playerIndex, pawnIndex)) {
            return false;
        }
        return topology.isHomeCellIndex(cell[playerIndex][pawnIndex]);
    }

    public void place(int playerIndex, int pawnIndex, int cellIndex) {
        cell[playerIndex][pawnIndex] = cellIndex;
        moved[playerIndex][pawnIndex] = false;
    }

    public void move(int playerIndex, int pawnIndex, int cellIndex) {
        cell[playerIndex][pawnIndex] = cellIndex;
        moved[playerIndex][pawnIndex] = true;
    }

    public void capture(int playerIndex, int pawnIndex) {
        cell[playerIndex][pawnIndex] = -1;
        moved[playerIndex][pawnIndex] = false;
    }

    /**
     * @return {@code int[]{playerIndex, pawnIndex}} of the occupant,
     * or {@code null} when the cell is free. Linear scan — fine for ≤16 pawns.
     */
    public int[] occupantAt(int cellIndex) {
        if (cellIndex < 0) {
            return null;
        }
        for (int pi = 0; pi < cell.length; pi++) {
            for (int ppi = 0; ppi < cell[pi].length; ppi++) {
                if (cell[pi][ppi] == cellIndex) {
                    return new int[]{pi, ppi};
                }
            }
        }
        return null;
    }

    public int countHome(int playerIndex) {
        int count = 0;
        for (int ppi = 0; ppi < cell[playerIndex].length; ppi++) {
            if (isHome(playerIndex, ppi)) {
                count++;
            }
        }
        return count;
    }
}
