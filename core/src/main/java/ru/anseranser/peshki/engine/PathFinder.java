package ru.anseranser.peshki.engine;

/**
 * Single movement function (ticket 06). Walks the topology from any start
 * cell and returns the target cell index, or {@code null} when the move is
 * illegal (blocked path, friendly pawn on landing, home overshoot,
 * last-lap flyover).
 *
 * <p>Pure: depends only on topology + position, never on live cells.
 *
 * @param canEnterHome false for newborns (they walk the ring) and for
 *                     place-and-move previews from the corner
 */
public final class PathFinder {

    private PathFinder() {}

    public static Integer find(BoardTopology topology, Position position,
                               int playerIndex, int startCellIndex,
                               int steps, boolean canEnterHome) {
        if (startCellIndex < 0 || steps < 1) {
            return null;
        }
        boolean inHome = topology.isHomeCellIndex(startCellIndex);
        boolean lastLap = !inHome
                && position.countHome(playerIndex) == topology.config().numberOfPawns() - 1;
        int corner = topology.cornerRingIndex(playerIndex);
        int current = startCellIndex;

        for (int i = 0; i < steps; i++) {
            boolean last = (i == steps - 1);
            int next;

            if (!inHome) {
                if (current == corner && canEnterHome) {
                    if (lastLap) {
                        return last ? corner : null;
                    }
                    inHome = true;
                    next = topology.homeCellIndex(playerIndex, 0);
                } else {
                    next = topology.nextRingIndex(current);
                    if (next == corner) {
                        if (lastLap) {
                            return last ? corner : null;
                        }
                        if (canEnterHome) {
                            inHome = true;
                        }
                    }
                }
            } else {
                // In home mode, but possibly still standing on the corner
                // (just landed on it) — first home step starts at home cell 0.
                if (current == corner) {
                    next = topology.homeCellIndex(playerIndex, 0);
                } else {
                    int step = topology.homeStep(playerIndex, current);
                    if (step + 1 >= topology.config().homeLength()) {
                        return null;
                    }
                    next = topology.homeCellIndex(playerIndex, step + 1);
                }
            }

            int[] occ = position.occupantAt(next);
            if (!last && occ != null) {
                return null;
            }
            if (last && occ != null && occ[0] == playerIndex) {
                return null;
            }
            current = next;
        }

        return current;
    }
}
