package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.engine.BoardTopology;

import java.util.ArrayList;
import java.util.List;

/**
 * Cell-by-cell path for move animation (desktop view concern).
 * The path follows the board geometry: along the ring, through
 * the player's own corner, then into the home tail.
 */
public final class AnimationPath {

    private AnimationPath() {}

    public static List<Integer> build(BoardTopology topology, int fromIndex,
                                      int toIndex, int playerIndex) {
        if (fromIndex == toIndex) {
            return List.of(fromIndex);
        }
        if (topology.isHomeCellIndex(fromIndex) && topology.isHomeCellIndex(toIndex)) {
            List<Integer> tail = homeTail(topology, playerIndex);
            int from = tail.indexOf(fromIndex);
            int to = tail.indexOf(toIndex);
            if (from >= 0 && to >= 0 && to > from) {
                return new ArrayList<>(tail.subList(from, to + 1));
            }
            return List.of(fromIndex, toIndex);
        }
        List<Integer> path = new ArrayList<>();
        path.add(fromIndex);
        if (topology.isHomeCellIndex(toIndex)) {
            int corner = topology.cornerRingIndex(playerIndex);
            path.addAll(ringWalk(topology, fromIndex, corner));
            for (int home : homeTail(topology, playerIndex)) {
                if (path.get(path.size() - 1) != home) {
                    path.add(home);
                }
                if (home == toIndex) {
                    break;
                }
            }
        } else {
            path.addAll(ringWalk(topology, fromIndex, toIndex));
        }
        return path;
    }

    private static List<Integer> ringWalk(BoardTopology topology, int from, int to) {
        List<Integer> steps = new ArrayList<>();
        int current = from;
        int guard = 0;
        while (current != to && guard++ <= topology.ringSize()) {
            current = topology.nextRingIndex(current);
            steps.add(current);
        }
        return steps;
    }

    private static List<Integer> homeTail(BoardTopology topology, int playerIndex) {
        List<Integer> tail = new ArrayList<>();
        for (int step = 0; step < topology.config().homeLength(); step++) {
            tail.add(topology.homeCellIndex(playerIndex, step));
        }
        return tail;
    }
}
