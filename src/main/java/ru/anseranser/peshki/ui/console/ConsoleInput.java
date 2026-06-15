package ru.anseranser.peshki.ui.console;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.input.InputService;
import ru.anseranser.peshki.input.MoveCommand;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class ConsoleInput implements InputService {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    @Override
    public MoveCommand getMove(Player player, List<Move> availableMoves, Board board,
                               List<Integer> allDice, List<Integer> usedDice, GameConfig config) {
        List<Integer> remaining = new ArrayList<>(allDice);
        for (int d : usedDice) remaining.remove(Integer.valueOf(d));

        System.out.println("  Dice: " + allDice);
        System.out.println("  Used: " + usedDice);
        System.out.println("  Left:  " + remaining);
        System.out.println("  Available moves:");

        for (int i = 0; i < availableMoves.size(); i++) {
            System.out.println("  " + (i + 1) + ". " + formatMove(player, availableMoves.get(i), board));
        }

        int choice = readNumber(1, availableMoves.size());
        Move selected = availableMoves.get(choice - 1);

        if (selected.pawn() == null) {
            if (selected.steps() == 0) {
                return new MoveCommand.PlacePawn(player.getNumber(), 6);
            } else {
                return new MoveCommand.PlaceAndMove(player.getNumber(), 6, selected.steps());
            }
        } else {
            return new MoveCommand.MovePawn(player.getNumber(), selected.pawn().getNumber(),
                    selected.steps(), selected.consumedDice());
        }
    }

    private String formatMove(Player player, Move move, Board board) {
        GameConfig config = new GameConfig(8, 4, 4, 2, 6, 5000);
        if (move.pawn() == null) {
            if (move.steps() == 0) {
                String kill = isKillingPlace(player) ? " [KILL!]" : "";
                return "Place new pawn on corner" + kill;
            }
            Cell target = simulateCornerMove(player, move.steps());
            String kill = (target != null && target.getPawn() != null) ? " [KILL!]" : "";
            return "Place new pawn + move " + move.steps() + " steps" + kill;
        }
        Cell target = move.pawn().findTargetCell(move.steps(), config);
        StringBuilder sb = new StringBuilder();
        sb.append("Pawn ").append(move.pawn().getPlayer().getNumber());
        sb.append(".").append(move.pawn().getNumber());
        sb.append(" -> ").append(move.steps()).append(" steps");
        if (target != null) {
            if (move.pawn().getState() != Pawn.State.HOMER
                    && target.getPawn() != null
                    && !target.getPawn().getPlayer().equals(move.pawn().getPlayer())) {
                sb.append(" [KILL!]");
            }
            if (move.pawn().getState() == Pawn.State.FIELDER
                    && target.getCellType() == Cell.CellType.HOME) {
                sb.append(" [HOME!]");
            }
            if (isWinningMove(move.pawn(), target)) {
                sb.append(" [WIN!]");
            }
        }
        return sb.toString();
    }

    private boolean isKillingPlace(Player player) {
        Cell corner = player.getCorner();
        return corner.getPawn() != null && !corner.getPawn().getPlayer().equals(player);
    }

    private boolean isWinningMove(Pawn pawn, Cell target) {
        if (target == null || pawn.getState() == Pawn.State.HOMER) return false;
        if (target != pawn.getPlayer().getCorner()) return false;
        return pawn.getPlayer().getPawns().stream()
                .filter(p -> p != pawn && p.getState() == Pawn.State.HOMER)
                .count() == 3;
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

    private int readNumber(int min, int max) {
        while (true) {
            try {
                System.out.print("  > ");
                String line = reader.readLine();
                if (line == null) return min;
                int num = Integer.parseInt(line.trim());
                if (num >= min && num <= max) return num;
                System.out.println("  Enter a number between " + min + " and " + max);
            } catch (NumberFormatException e) {
                System.out.println("  Invalid input");
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }
}
