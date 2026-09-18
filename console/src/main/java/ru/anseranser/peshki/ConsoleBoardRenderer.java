package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.DisplayNumbers;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.PlayerColor;

import java.util.HashMap;
import java.util.Map;

public class ConsoleBoardRenderer {

    private static final Map<PlayerColor, String> ANSI = Map.of(
            PlayerColor.RED, "\033[31m",
            PlayerColor.GREEN, "\033[32m",
            PlayerColor.YELLOW, "\033[33m",
            PlayerColor.BLUE, "\033[34m"
    );
    private static final String RESET = "\033[0m";

    public static String[] render(GameState state) {
        int size = state.config().sideLength();
        String[][] grid = new String[size][size];
        for (String[] row : grid) {
            java.util.Arrays.fill(row, "# ");
        }

        for (GameState.CellState c : state.cells()) {
            grid[c.y()][c.x()] = cellToString(c, numbers(state));
        }

        String[] lines = new String[size];
        for (int i = 0; i < size; i++) {
            lines[i] = String.join("", grid[i]);
        }
        return lines;
    }

    private static Map<Integer, Map<Integer, Integer>> numbers(GameState state) {
        Map<Integer, Map<Integer, Integer>> result = new HashMap<>();
        for (GameState.PlayerState ps : state.players()) {
            result.put(ps.playerIndex(), DisplayNumbers.assign(ps.pawns()));
        }
        return result;
    }

    private static String cellToString(GameState.CellState c,
                                       Map<Integer, Map<Integer, Integer>> numbers) {
        if (c.occupantPlayerIndex() == null) return "# ";
        int display = numbers.get(c.occupantPlayerIndex()).get(c.occupantPawnIndex());
        return ANSI.get(c.occupantColor()) + display + RESET + " ";
    }
}
