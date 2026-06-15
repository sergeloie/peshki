package ru.anseranser.peshki.input;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Cell;
import ru.anseranser.peshki.model.Pawn;
import ru.anseranser.peshki.model.Player;
import ru.anseranser.peshki.util.RenderBoard;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

import static ru.anseranser.peshki.MainConfig.numberOfPawns;

public class ConsoleMoveInput implements MoveInputService {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    @Override
    public Player.Move selectMove(Player player, List<Player.Move> availableMoves, Board board,
                                  List<Integer> allDice, List<Integer> usedDice) {
        if (availableMoves.isEmpty()) return null;

        printBoard(board);

        List<Integer> remaining = new ArrayList<>(allDice);
        for (int d : usedDice) {
            remaining.remove(Integer.valueOf(d));
        }

        System.out.println("  Dice: " + allDice);
        System.out.println("  Used: " + usedDice);
        System.out.println("  Left:  " + remaining);

        System.out.println("  Available moves:");
        for (int i = 0; i < availableMoves.size(); i++) {
                System.out.println("  " + (i + 1) + ". " + formatMove(player, availableMoves.get(i)));
        }

        int choice = readNumber(1, availableMoves.size());
        return availableMoves.get(choice - 1);
    }

    private int readNumber(int min, int max) {
        while (true) {
            try {
                System.out.print("  > ");
                String line = reader.readLine();
                if (line == null) return min;
                int num = Integer.parseInt(line.trim());
                if (num >= min && num <= max) return num;
                System.out.println("  Please enter a number between " + min + " and " + max);
            } catch (NumberFormatException e) {
                System.out.println("  Invalid input, try again");
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    private String formatMove(Player player, Player.Move move) {
        if (move.pawn() == null) {
            if (move.steps() == 0) {
                return "Place new pawn on corner";
            }
            Cell target = simulateCornerMove(player, move.steps());
            StringBuilder sb = new StringBuilder();
            sb.append("Place new pawn + move ").append(move.steps()).append(" steps");
            if (target != null && target.getPawn() != null) {
                sb.append(" [KILL!]");
            }
            if (isWinningPlaceAndMove(player, move.steps())) {
                sb.append(" [WIN!]");
            }
            return sb.toString();
        }
        Cell target = move.pawn().findTargetCell(move.steps());
        StringBuilder sb = new StringBuilder();
        sb.append("Pawn ").append(move.pawn().getPlayer().getPlayerNumber());
        sb.append(".").append(move.pawn().getNumber());
        sb.append(" -> ").append(move.steps()).append(" steps");
        if (target != null) {
            if (move.pawn().getState() != Pawn.PawnState.HOMER
                    && target.getPawn() != null
                    && !target.getPawn().getPlayer().equals(move.pawn().getPlayer())) {
                sb.append(" [KILL!]");
            }
            if (move.pawn().getState() == Pawn.PawnState.FIELDER
                    && target.getCellType() == Cell.CellType.HOME) {
                sb.append(" [HOME!]");
            }
            if (isWinningMove(move.pawn(), target)) {
                sb.append(" [WIN!]");
            }
        }
        return sb.toString();
    }

    private boolean isWinningMove(Pawn pawn, Cell target) {
        if (target == null || pawn.getState() == Pawn.PawnState.HOMER) return false;
        if (target != pawn.getPlayer().getCorner()) return false;
        return pawn.getPlayer().getPawns().stream()
                .filter(p -> p != pawn && p.getState() == Pawn.PawnState.HOMER)
                .count() == numberOfPawns - 1;
    }

    private boolean isWinningPlaceAndMove(Player player, int steps) {
        Cell target = simulateCornerMove(player, steps);
        if (target == null || target != player.getCorner()) return false;
        return player.getPawns().stream()
                .filter(p -> p.getState() == Pawn.PawnState.HOMER)
                .count() == numberOfPawns - 1;
    }

    private Cell simulateCornerMove(Player player, int steps) {
        Cell current = player.getCorner();
        for (int i = 0; i < steps; i++) {
            Cell next = current.getNextFieldCell();
            if (next == null) return null;
            current = next;
        }
        return current;
    }

    private void printBoard(Board board) {
        String[] lines = RenderBoard.renderBoard(board);
        for (String line : lines) {
            System.out.println("  " + line);
        }
        System.out.println();
    }
}
