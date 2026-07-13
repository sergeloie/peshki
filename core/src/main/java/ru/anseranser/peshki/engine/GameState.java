package ru.anseranser.peshki.engine;

import java.util.List;

/**
 * UI-agnostic, serializable snapshot of the whole game. Any view (console,
 * mobile, desktop) renders from this; the engine never depends on a view.
 * Records are used so the structure is trivially JSON-serializable (Phase 4).
 */
public record GameState(
        GameConfig config,
        int currentPlayerIndex,
        List<Integer> currentDice,
        int turnNumber,
        boolean gameOver,
        int winnerPlayerNumber,
        List<PlayerState> players,
        List<CellState> cells
) {

    public record PlayerState(
            int number,
            PlayerColor color,
            boolean human,
            List<PawnState> pawns
    ) {}

    public record PawnState(
            int number,
            Pawn.State state,
            int cellIndex
    ) {}

    public record CellState(
            int index,
            int x,
            int y,
            Cell.CellType type,
            Integer occupantPlayerNumber,
            PlayerColor occupantColor,
            Integer occupantPawnNumber,
            Integer ownerPlayerNumber
    ) {}
}
