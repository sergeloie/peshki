package ru.anseranser.peshki.engine;

import java.util.List;

public record GameState(
        GameConfig config,
        int currentPlayerIndex,
        List<Integer> currentDice,
        int turnNumber,
        boolean gameOver,
        int winnerPlayerIndex,
        List<PlayerState> players,
        List<CellState> cells
) {

    public record PlayerState(
            int playerIndex,
            PlayerColor color,
            boolean human,
            List<PawnState> pawns
    ) {}

    public record PawnState(
            int pawnIndex,
            Pawn.State state,
            int stepsTraveled,
            int cellIndex
    ) {}

    public record CellState(
            int index,
            int x,
            int y,
            Cell.CellType type,
            Integer occupantPlayerIndex,
            PlayerColor occupantColor,
            Integer occupantPawnIndex,
            Integer ownerPlayerIndex
    ) {}
}
