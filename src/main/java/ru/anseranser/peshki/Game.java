package ru.anseranser.peshki;

import ru.anseranser.peshki.input.MoveInputService;
import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Cell;
import ru.anseranser.peshki.model.Pawn;
import ru.anseranser.peshki.model.Player;
import ru.anseranser.peshki.util.RenderBoard;

import java.util.ArrayList;
import java.util.List;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;

public class Game {

    private static final int MAX_TURNS = 5000;

    private final Board board;
    private final MoveInputService moveInputService;
    private int currentPlayerIndex = 0;

    public Game(MoveInputService moveInputService) {
        this.board = new Board();
        this.moveInputService = moveInputService;
    }

    public void start() {
        int turnCount = 0;
        String[] beforeBoard = RenderBoard.renderBoard(board);
        while (!isGameOver() && turnCount < MAX_TURNS) {
            turnCount++;
            Player currentPlayer = board.getPlayers().get(currentPlayerIndex);
            System.out.println("=== Turn " + turnCount + " | Player " + currentPlayer.getPlayerNumber()
                    + (currentPlayer.isHuman() ? " (YOU)" : " (BOT)") + " ===");

            boolean extraTurn = takeTurn(currentPlayer);
            String[] afterBoard = RenderBoard.renderBoard(board);

            RenderBoard.drawBoardsSideBySide(beforeBoard, afterBoard);
            System.out.println();

            if (isGameOver()) {
                System.out.println("Player " + currentPlayer.getPlayerNumber() + " wins!");
                return;
            }
            if (!extraTurn) {
                currentPlayerIndex = (currentPlayerIndex + 1) % board.getPlayers().size();
            }
            beforeBoard = afterBoard;
        }
        System.out.println("Game ended after " + MAX_TURNS + " turns.");
    }

    private boolean takeTurn(Player player) {
        List<Integer> dice = player.DropDices();
        boolean extraTurn = dice.contains(6);
        boolean kickedEnemy;

        if (player.isHuman()) {
            kickedEnemy = takeHumanTurn(player, dice);
        } else {
            kickedEnemy = takeBotTurn(player, dice);
        }

        return extraTurn || kickedEnemy;
    }

    private boolean takeBotTurn(Player player, List<Integer> dice) {
        System.out.println("  Rolled: " + dice);

        boolean kickedEnemy = false;

        if (dice.contains(6) && player.shouldPlacePawn(dice)) {
            boolean placed = player.tryPlaceNewPawn();
            if (placed) {
                System.out.println("  Placed new pawn on corner");
                List<Integer> remainingDice = new ArrayList<>(dice);
                remainingDice.remove(Integer.valueOf(6));
                kickedEnemy = executeBotMoves(player, remainingDice);
            } else {
                kickedEnemy = executeBotMoves(player, dice);
            }
        } else {
            kickedEnemy = executeBotMoves(player, dice);
        }

        return kickedEnemy;
    }

    private boolean executeBotMoves(Player player, List<Integer> dice) {
        boolean kickedEnemy = false;
        List<Integer> remainingDice = new ArrayList<>(dice);
        List<Integer> usedDice = new ArrayList<>();

        while (!remainingDice.isEmpty()) {
            List<Player.Move> availableMoves = player.generateAllMoves(remainingDice);
            if (availableMoves.isEmpty()) break;

            Player.Move bestMove = player.findBestMove(remainingDice).orElse(null);
            if (bestMove == null) break;

            Cell target = bestMove.pawn().findTargetCell(bestMove.steps());

            if (bestMove.pawn().getState() != Pawn.PawnState.HOMER
                    && target.getPawn() != null
                    && !target.getPawn().getPlayer().equals(player)) {
                System.out.println("  Pawn " + bestMove.pawn().getPlayer().getPlayerNumber()
                        + "." + bestMove.pawn().getNumber()
                        + " killed enemy pawn " + target.getPawn().getPlayer().getPlayerNumber()
                        + "." + target.getPawn().getNumber());
                target.getPawn().remove();
                kickedEnemy = true;
            } else {
                System.out.println("  Pawn " + bestMove.pawn().getPlayer().getPlayerNumber()
                        + "." + bestMove.pawn().getNumber()
                        + " moved " + bestMove.steps() + " steps");
            }

            bestMove.pawn().moveTo(target);
            usedDice.addAll(bestMove.consumedDice());
            for (int d : bestMove.consumedDice()) {
                remainingDice.remove(Integer.valueOf(d));
            }
        }

        return kickedEnemy;
    }

    private boolean takeHumanTurn(Player player, List<Integer> dice) {
        System.out.println("  Rolled: " + dice);

        boolean kickedEnemy = false;
        List<Integer> remainingDice = new ArrayList<>(dice);
        List<Integer> usedDice = new ArrayList<>();

        if (remainingDice.contains(6) && !player.getPawnsByState(Pawn.PawnState.BENCH).isEmpty()) {
            boolean shouldPlace = moveInputService.askPlacePawn(player, remainingDice, board);
            if (shouldPlace) {
                boolean placed = player.tryPlaceNewPawn();
                if (placed) {
                    System.out.println("  Placed new pawn on corner");
                    remainingDice.remove(Integer.valueOf(6));
                    usedDice.add(6);
                }
            }
        }

        while (!remainingDice.isEmpty()) {
            List<Player.Move> availableMoves = player.generateAllMoves(remainingDice);
            if (availableMoves.isEmpty()) break;

            Player.Move selectedMove = moveInputService.selectMove(
                    player, availableMoves, board, dice, usedDice);
            if (selectedMove == null) break;

            Pawn pawn = selectedMove.pawn();
            Cell target = pawn.findTargetCell(selectedMove.steps());

            if (pawn.getState() != Pawn.PawnState.HOMER
                    && target.getPawn() != null
                    && !target.getPawn().getPlayer().equals(player)) {
                System.out.println("  Killed enemy pawn " + target.getPawn().getPlayer().getPlayerNumber()
                        + "." + target.getPawn().getNumber());
                target.getPawn().remove();
                kickedEnemy = true;
            }

            pawn.moveTo(target);
            usedDice.addAll(selectedMove.consumedDice());
            for (int d : selectedMove.consumedDice()) {
                remainingDice.remove(Integer.valueOf(d));
            }
        }

        return kickedEnemy;
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
