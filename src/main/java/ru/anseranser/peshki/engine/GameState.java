package ru.anseranser.peshki.engine;

import ru.anseranser.peshki.engine.Board;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.Pawn;
import ru.anseranser.peshki.engine.Player;

import java.util.List;

public record GameState(
        int turnNumber,
        int currentPlayerIndex,
        List<PlayerState> players,
        List<Integer> lastDice,
        GameConfig config
) {
    public record PlayerState(
            int number,
            boolean isHuman,
            List<PawnState> pawns
    ) {}

    public record PawnState(
            int number,
            String state,
            int cellIndex
    ) {}

    public static GameState from(Board board, int turn, int currentPlayerIndex, List<Integer> lastDice, GameConfig config) {
        List<PlayerState> playerStates = board.getPlayers().stream()
                .map(p -> new PlayerState(
                        p.getNumber(),
                        p.isHuman(),
                        p.getPawns().stream()
                                .map(pawn -> new PawnState(
                                        pawn.getNumber(),
                                        pawn.getState().name(),
                                        pawn.getCell() != null ? cellIndex(pawn, board) : -1
                                ))
                                .toList()
                ))
                .toList();
        return new GameState(turn, currentPlayerIndex, playerStates, lastDice, config);
    }

    private static int cellIndex(Pawn pawn, Board board) {
        // Simplified: return player-relative position
        return 0;
    }
}
