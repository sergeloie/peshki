package ru.anseranser.peshki.input;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Cell;
import ru.anseranser.peshki.model.Player;
import ru.anseranser.peshki.util.RenderBoard;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class ConsoleMoveInput implements MoveInputService {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    @Override
    public boolean askPlacePawn(Player player, List<Integer> dice, Board board) {
        printBoard(board);
        System.out.println("  Rolled: " + dice);
        System.out.println("  Place a new pawn on your corner?");
        System.out.println("  1. Yes");
        System.out.println("  2. No");
        return readNumber(1, 2) == 1;
    }

    @Override
    public Player.Move selectMove(Player player, List<Player.Move> availableMoves, Board board) {
        if (availableMoves.isEmpty()) return null;

        printBoard(board);

        List<Player.Move> allOptions = new ArrayList<>(availableMoves);
        allOptions.add(null);

        System.out.println("  Available moves:");
        for (int i = 0; i < allOptions.size(); i++) {
            if (allOptions.get(i) == null) {
                System.out.println("  " + (i + 1) + ". Skip");
            } else {
                System.out.println("  " + (i + 1) + ". " + formatMove(allOptions.get(i)));
            }
        }

        int choice = readNumber(1, allOptions.size());
        return allOptions.get(choice - 1);
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

    private String formatMove(Player.Move move) {
        Cell target = move.pawn().findTargetCell(move.steps());
        StringBuilder sb = new StringBuilder();
        sb.append("Pawn ").append(move.pawn().getPlayer().getPlayerNumber());
        sb.append(".").append(move.pawn().getNumber());
        sb.append(" -> ").append(move.steps()).append(" steps");
        if (target != null) {
            if (move.pawn().getState() != ru.anseranser.peshki.model.Pawn.PawnState.HOMER
                    && target.getPawn() != null
                    && !target.getPawn().getPlayer().equals(move.pawn().getPlayer())) {
                sb.append(" [KILL!]");
            }
            if (move.pawn().getState() == ru.anseranser.peshki.model.Pawn.PawnState.FIELDER
                    && target.getCellType() == Cell.CellType.HOME) {
                sb.append(" [HOME!]");
            }
        }
        return sb.toString();
    }

    private void printBoard(Board board) {
        String[] lines = RenderBoard.renderBoard(board);
        for (String line : lines) {
            System.out.println("  " + line);
        }
        System.out.println();
    }
}
