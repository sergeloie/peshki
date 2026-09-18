package ru.anseranser.peshki.engine;

/**
 * Immutable board topology derived purely from {@link GameConfig} (ticket 03).
 *
 * <p>Layout contract (must match the historical {@link Board} graph order):
 * <ol>
 *   <li>Ring: {@code corner0, field cells..., corner1, ...}, total
 *       {@code numberOfPlayers + fieldLength} cells, in counter-clockwise order.</li>
 *   <li>Home tails appended per player: {@code homeLength} cells each.</li>
 * </ol>
 * All navigation is index arithmetic — no pointer chasing, no mutation.
 */
public final class BoardTopology {

    private final GameConfig config;
    private final int segmentLength;
    private final int ringSize;
    private final int totalCells;

    public BoardTopology(GameConfig config) {
        this.config = config;
        this.segmentLength = config.sideLength() - 1;
        this.ringSize = config.numberOfPlayers() + config.fieldLength();
        this.totalCells = ringSize + config.numberOfPlayers() * config.homeLength();
    }

    public GameConfig config() {
        return config;
    }

    public int ringSize() {
        return ringSize;
    }

    public int totalCells() {
        return totalCells;
    }

    public int cornerRingIndex(int playerIndex) {
        return playerIndex * segmentLength;
    }

    public boolean isCornerRingIndex(int ringIndex) {
        return ringIndex % segmentLength == 0;
    }

    public int cornerOwner(int ringIndex) {
        if (!isCornerRingIndex(ringIndex)) {
            throw new IllegalArgumentException("Not a corner index: " + ringIndex);
        }
        return ringIndex / segmentLength;
    }

    public int nextRingIndex(int ringIndex) {
        return (ringIndex + 1) % ringSize;
    }

    public int homeCellIndex(int playerIndex, int homeStep) {
        if (homeStep < 0 || homeStep >= config.homeLength()) {
            throw new IllegalArgumentException("Home step out of range: " + homeStep);
        }
        return ringSize + playerIndex * config.homeLength() + homeStep;
    }

    public boolean isHomeCellIndex(int cellIndex) {
        return cellIndex >= ringSize && cellIndex < totalCells;
    }

    public int homeStep(int playerIndex, int cellIndex) {
        int step = cellIndex - (ringSize + playerIndex * config.homeLength());
        if (step < 0 || step >= config.homeLength()) {
            throw new IllegalArgumentException(
                    "Cell " + cellIndex + " is not a home cell of player " + playerIndex);
        }
        return step;
    }

    public boolean isRingCellIndex(int cellIndex) {
        return cellIndex >= 0 && cellIndex < ringSize;
    }
}
