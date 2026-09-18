package ru.anseranser.peshki.engine;

/**
 * Immutable snapshot of the board for move selectors (ticket 08).
 * Bots, humans (via UI) and future neural networks all read this —
 * never the live mutable board.
 */
public final class PositionView {

    private final GameConfig config;
    private final BoardTopology topology;
    private final Position position;

    private PositionView(GameConfig config, BoardTopology topology, Position position) {
        this.config = config;
        this.topology = topology;
        this.position = position;
    }

    public static PositionView snapshot(Board board) {
        return new PositionView(board.getConfig(), board.getTopology(),
                new Position(board.getPosition()));
    }

    public GameConfig config() {
        return config;
    }

    public BoardTopology topology() {
        return topology;
    }

    Position position() {
        return position;
    }

    public int cellOf(int playerIndex, int pawnIndex) {
        return position.cellOf(playerIndex, pawnIndex);
    }

    public boolean isBench(int playerIndex, int pawnIndex) {
        return position.isBench(playerIndex, pawnIndex);
    }

    public boolean isNewborn(int playerIndex, int pawnIndex) {
        return position.isNewborn(playerIndex, pawnIndex);
    }

    public boolean isHome(int playerIndex, int pawnIndex) {
        return position.isHome(playerIndex, pawnIndex);
    }

    public boolean isFielder(int playerIndex, int pawnIndex) {
        return !isBench(playerIndex, pawnIndex)
                && !isNewborn(playerIndex, pawnIndex)
                && !isHome(playerIndex, pawnIndex);
    }

    public boolean hasMoved(int playerIndex, int pawnIndex) {
        return position.hasMoved(playerIndex, pawnIndex);
    }

    public int countHome(int playerIndex) {
        return position.countHome(playerIndex);
    }

    public int[] occupantAt(int cellIndex) {
        return position.occupantAt(cellIndex);
    }

    public int ownCorner(int playerIndex) {
        return topology.cornerRingIndex(playerIndex);
    }

    public boolean isHomeCell(int cellIndex) {
        return topology.isHomeCellIndex(cellIndex);
    }

    public boolean isOwnCornerCell(int cellIndex, int playerIndex) {
        return cellIndex == topology.cornerRingIndex(playerIndex);
    }

    public boolean isCornerCell(int cellIndex) {
        return topology.isRingCellIndex(cellIndex)
                && topology.isCornerRingIndex(cellIndex);
    }

    public int cornerOwner(int cellIndex) {
        return topology.cornerOwner(cellIndex);
    }

    public Integer findTarget(int playerIndex, int pawnIndex, int steps) {
        return PathFinder.find(topology, position, playerIndex,
                position.cellOf(playerIndex, pawnIndex),
                steps, !position.isNewborn(playerIndex, pawnIndex));
    }

    public Integer findTargetFromCorner(int playerIndex, int steps) {
        return PathFinder.find(topology, position, playerIndex,
                topology.cornerRingIndex(playerIndex), steps, false);
    }

    /**
     * Ring steps from the pawn to its own corner (for distance heuristics).
     * Pawns already home return 0.
     */
    public int ringDistanceToOwnCorner(int playerIndex, int pawnIndex) {
        if (isHome(playerIndex, pawnIndex)) {
            return 0;
        }
        int cell = position.cellOf(playerIndex, pawnIndex);
        if (cell < 0) {
            return topology.ringSize();
        }
        int corner = topology.cornerRingIndex(playerIndex);
        if (cell == corner) {
            return 0;
        }
        int distance = 0;
        int current = cell;
        while (current != corner && distance <= topology.ringSize()) {
            current = topology.nextRingIndex(current);
            distance++;
        }
        return distance;
    }
}
