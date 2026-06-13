package ru.anseranser.peshki;

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
            if (!extraTurn) {
                currentPlayerIndex = (currentPlayerIndex + 1) % board.getPlayers().size();
            }
        }
        if (isGameOver()) {
            Player winner = board.getPlayers().get(currentPlayerIndex);
            System.out.println("Player " + winner.getPlayerNumber() + " wins!");
        } else {
            System.out.println("Game ended after " + MAX_TURNS + " turns.");
        }
    }

    private boolean takeTurn(Player player) {
        List<Integer> dice = player.DropDices();
        System.out.println("  Rolled: " + dice);

        boolean kickedEnemy = false;
        boolean rolledSix = dice.contains(6);

        List<Integer> moveDice = new ArrayList<>(dice);

        if (rolledSix) {
            boolean placed = tryPlaceNewPawn(player);
            if (placed) {
                moveDice.remove(Integer.valueOf(6));
            }
        }

        kickedEnemy = tryMovePawns(player, moveDice);

        return rolledSix || kickedEnemy;
    }

    private boolean tryPlaceNewPawn(Player player) {
        Cell cornerCell = board.getCorners().get(player);
        Pawn existingPawn = cornerCell.getPawn();

        if (existingPawn != null && existingPawn.getPlayer().equals(player)) {
            return false;
        }

        List<Pawn> benchPawns = player.getPawnsByState(Pawn.PawnState.BENCH);
        if (benchPawns.isEmpty()) {
            return false;
        }

        if (existingPawn != null) {
            existingPawn.remove();
        }

        player.putNewPawn();
        return true;
    }

    private boolean tryMovePawns(Player player, List<Integer> dice) {
        boolean kickedEnemy = false;
        for (int diceValue : dice) {
            List<Pawn> moveablePawns = player.getPawnsByState(
                    Pawn.PawnState.NEWBORN,
                    Pawn.PawnState.FIELDER,
                    Pawn.PawnState.HOMER);
            for (Pawn pawn : moveablePawns) {
                Cell targetCell = findTargetCell(pawn, diceValue);
                if (targetCell != null) {
                    if (pawn.getState() != Pawn.PawnState.HOMER
                            && targetCell.getPawn() != null
                            && !targetCell.getPawn().getPlayer().equals(player)) {
                        targetCell.getPawn().remove();
                        kickedEnemy = true;
                    }
                    movePawn(pawn, targetCell);
                    break;
                }
            }
        }
        return kickedEnemy;
    }

    private Cell findTargetCell(Pawn pawn, int steps) {
        Cell current = pawn.getCell();
        Player player = pawn.getPlayer();
        Cell corner = board.getCorner(player);
        boolean inHome = pawn.getState() == Pawn.PawnState.HOMER;
        boolean isLastLapPawn = !inHome
                && player.getPawnsByState(Pawn.PawnState.HOMER, Pawn.PawnState.FINISHER).size() == numberOfPawns - 1;

        for (int i = 0; i < steps; i++) {
            Cell next;

            if (!inHome) {
                next = current.getNextFieldCell();
                if (next == corner) {
                    if (isLastLapPawn) {
                        if (i < steps - 1) {
                            return null;
                        }
                        return corner;
                    }
                    inHome = true;
                    next = next.getNextHomeCell();
                }
            } else {
                next = current.getNextHomeCell();
            }

            if (next == null) {
                return null;
            }

            if (i < steps - 1 && next.getPawn() != null) {
                return null;
            }

            if (i == steps - 1 && next.getPawn() != null
                    && next.getPawn().getPlayer().equals(player)) {
                return null;
            }

            current = next;
        }
        return current;
    }

    private void movePawn(Pawn pawn, Cell targetCell) {
        if (pawn.getCell() != null) {
            pawn.getCell().setPawn(null);
        }
        targetCell.setPawn(pawn);
        pawn.setCell(targetCell);

        if (pawn.getState() == Pawn.PawnState.NEWBORN) {
            pawn.setState(Pawn.PawnState.FIELDER);
        }

        if (pawn.getState() == Pawn.PawnState.FIELDER && targetCell.getCellType() == Cell.CellType.HOME) {
            pawn.setState(Pawn.PawnState.HOMER);
        }

        if (pawn.getState() == Pawn.PawnState.HOMER && targetCell.getNextHomeCell() == null) {
            pawn.setState(Pawn.PawnState.FINISHER);
        }
    }

    private boolean isGameOver() {
        return board.getPlayers().stream()
                .anyMatch(player -> {
                    long homeCount = player.getPawns().stream()
                            .filter(pawn -> pawn.getState() == Pawn.PawnState.HOMER
                                    || pawn.getState() == Pawn.PawnState.FINISHER)
                            .count();
                    if (homeCount != numberOfPawns - 1) return false;

                    Pawn lastPawn = player.getPawns().stream()
                            .filter(pawn -> pawn.getState() != Pawn.PawnState.HOMER
                                    && pawn.getState() != Pawn.PawnState.FINISHER)
                            .findFirst()
                            .orElse(null);

                    if (lastPawn == null) return false;
                    if (lastPawn.getState() == Pawn.PawnState.BENCH
                            || lastPawn.getState() == Pawn.PawnState.NEWBORN) return false;

                    return lastPawn.getCell() == board.getCorner(player);
                });
    }
}
