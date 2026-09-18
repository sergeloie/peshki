package ru.anseranser.peshki.engine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * View-side numbering of a player's pawns #1..#N by closeness to home
 * (ticket 05). Pure function over the snapshot — no UI imports, so both
 * console and desktop share it instead of duplicating the ranking.
 */
public final class DisplayNumbers {

    private DisplayNumbers() {}

    /**
     * @return pawnIndex → display number (1 = closest to home).
     * Ties break by lower pawnIndex so the result is deterministic.
     */
    public static Map<Integer, Integer> assign(List<GameState.PawnState> pawns) {
        List<GameState.PawnState> sorted = new ArrayList<>(pawns);
        sorted.sort(Comparator.comparingInt(GameState.PawnState::progress).reversed()
                .thenComparingInt(GameState.PawnState::pawnIndex));
        Map<Integer, Integer> result = new LinkedHashMap<>();
        for (int i = 0; i < sorted.size(); i++) {
            result.put(sorted.get(i).pawnIndex(), i + 1);
        }
        return result;
    }
}
