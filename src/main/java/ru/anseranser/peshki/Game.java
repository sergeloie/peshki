package ru.anseranser.peshki;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Pawn;
import ru.anseranser.peshki.model.Player;
import ru.anseranser.peshki.util.RenderBoard;

import java.util.ArrayList;
import java.util.List;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;

public class Game {

    private static final int MAX_TURNS = 5000;

    private final Board board;
    private int currentPlayerIndex = 0;

    public Game() {
        this.board = new Board();
    }

    public void start() {
        int turnCount = 0;
        while (!isGameOver() && turnCount < MAX_TURNS) {
            turnCount++;
            Player currentPlayer = board.getPlayers().get(currentPlayerIndex);
            System.out.println("=== Turn " + turnCount + " | Player " + currentPlayer.getPlayerNumber() + " ===");
            boolean extraTurn = takeTurn(currentPlayer);
            RenderBoard.drawBoard(board);
            System.out.println();
            if (isGameOver()) {
                System.out.println("Player " + currentPlayer.getPlayerNumber() + " wins!");
                return;
            }
            if (!extraTurn) {
                currentPlayerIndex = (currentPlayerIndex + 1) % board.getPlayers().size();
            }
        }
        System.out.println("Game ended after " + MAX_TURNS + " turns.");
    }

    private boolean takeTurn(Player player) {
        List<Integer> dice = player.DropDices();
        System.out.println("  Rolled: " + dice);

        boolean kickedEnemy = false;
        boolean rolledSix = dice.contains(6);

        List<Integer> moveDice = new ArrayList<>(dice);

        if (rolledSix) {
            boolean placed = player.tryPlaceNewPawn();
            if (placed) {
                moveDice.remove(Integer.valueOf(6));
            }
        }

        kickedEnemy = player.tryMovePawns(moveDice);

        return rolledSix || kickedEnemy;
    }

    private boolean isGameOver() {
        return board.getPlayers().stream()
                .anyMatch(player -> {
                    long homeCount = player.getPawns().stream()
                            .filter(pawn -> pawn.getState() == Pawn.PawnState.HOMER)
                            .count();
                    if (homeCount != numberOfPawns - 1) return false;

                    Pawn lastPawn = player.getPawns().stream()
                            .filter(pawn -> pawn.getState() != Pawn.PawnState.HOMER)
                            .findFirst()
                            .orElse(null);

                    if (lastPawn == null) return false;
                    if (lastPawn.getState() == Pawn.PawnState.BENCH
                            || lastPawn.getState() == Pawn.PawnState.NEWBORN) return false;

                    return lastPawn.getCell() == board.getCorner(player);
                });
    }
}
