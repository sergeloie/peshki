package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.PlayerColor;

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
            grid[c.y()][c.x()] = cellToString(c);
        }

        String[] lines = new String[size];
        for (int i = 0; i < size; i++) {
            lines[i] = String.join("", grid[i]);
        }
        return lines;
    }

    private static String cellToString(GameState.CellState c) {
        if (c.occupantPlayerNumber() == null) return "# ";
        return ANSI.get(c.occupantColor()) + c.occupantPlayerNumber() + RESET + " ";
    }
}
