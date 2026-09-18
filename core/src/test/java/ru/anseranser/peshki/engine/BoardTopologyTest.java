package ru.anseranser.peshki.engine;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Ticket 03: topology is a pure function of config and matches
 * the historical Board graph order (expand phase — old code untouched).
 */
class BoardTopologyTest {

    @ParameterizedTest
    @ValueSource(ints = {2, 3, 4})
    void ringSizeAndTotalCellsFollowConfig(int players) {
        GameConfig config = new GameConfig(8, players, 4, 2, 6, 5000);
        BoardTopology topology = new BoardTopology(config);

        assertEquals(players + players * (8 - 2), topology.ringSize());
        assertEquals(topology.ringSize() + players * 3, topology.totalCells());
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3, 4})
    void cornerIndexesMatchBoard(int players) {
        GameConfig config = new GameConfig(8, players, 4, 2, 6, 5000);
        BoardTopology topology = new BoardTopology(config);
        Board board = new Board(config);

        for (int pi = 0; pi < players; pi++) {
            assertEquals(board.getCorner(pi).getIndex(),
                    topology.cornerRingIndex(pi),
                    "Corner index mismatch for player " + pi);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3, 4})
    void ringWalkMatchesBoardOrder(int players) {
        GameConfig config = new GameConfig(8, players, 4, 2, 6, 5000);
        BoardTopology topology = new BoardTopology(config);
        Board board = new Board(config);

        Cell current = board.getCorner(0);
        int ringIndex = topology.cornerRingIndex(0);
        for (int i = 0; i < topology.ringSize(); i++) {
            assertEquals(current.getIndex(), ringIndex,
                    "Ring order diverges at step " + i);
            current = current.getNextFieldCell();
            ringIndex = topology.nextRingIndex(ringIndex);
        }
        assertEquals(board.getCorner(0), current, "Ring must close");
        assertEquals(topology.cornerRingIndex(0), ringIndex, "Index walk must wrap");
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 3, 4})
    void homeTailsMatchBoard(int players) {
        GameConfig config = new GameConfig(8, players, 4, 2, 6, 5000);
        BoardTopology topology = new BoardTopology(config);
        Board board = new Board(config);

        for (int pi = 0; pi < players; pi++) {
            Cell home = board.getCorner(pi).getNextHomeCell();
            int step = 0;
            while (home != null) {
                assertEquals(home.getIndex(), topology.homeCellIndex(pi, step));
                assertTrue(topology.isHomeCellIndex(home.getIndex()));
                home = home.getNextHomeCell();
                step++;
            }
            assertEquals(config.homeLength(), step);
        }
    }

    @Test
    void cornerHelpersBehave() {
        BoardTopology topology = new BoardTopology(GameConfig.DEFAULT);

        assertTrue(topology.isCornerRingIndex(0));
        assertTrue(topology.isCornerRingIndex(7));
        assertTrue(topology.isCornerRingIndex(21));
        assertEquals(3, topology.cornerOwner(21));
        assertEquals(0, topology.nextRingIndex(27));
        assertTrue(topology.isRingCellIndex(27));
        assertTrue(topology.isHomeCellIndex(28));
        assertThrows(IllegalArgumentException.class, () -> topology.cornerOwner(5));
        assertThrows(IllegalArgumentException.class, () -> topology.homeCellIndex(0, 3));
    }
}
