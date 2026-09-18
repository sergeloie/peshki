package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.i18n.Messages;
import ru.anseranser.peshki.input.InputService;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class ConsoleInput implements InputService {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    @Override
    public Move getMove(GameState state, List<Move> availableMoves,
                        List<Integer> allDice, List<Integer> usedDice, GameConfig config) {
        List<Integer> remaining = new ArrayList<>(allDice);
        for (int d : usedDice) remaining.remove(Integer.valueOf(d));

        GameState.PlayerState current = state.players().get(state.currentPlayerIndex());
        int playerIndex = current.playerIndex();
        PlayerColor myColor = current.color();

        System.out.println(Messages.get("prompt.dice", allDice));
        System.out.println(Messages.get("prompt.used", usedDice));
        System.out.println(Messages.get("prompt.left", remaining));
        System.out.println(Messages.get("prompt.moves"));

        List<Move> sorted = new ArrayList<>(availableMoves);
        Map<Integer, Integer> numbers = DisplayNumbers.assign(current.pawns());
        sorted.sort(Comparator
                .comparingInt((Move m) -> switch (m) {
                    case Move.Place ignored -> 0;
                    case Move.Step s -> numbers.get(s.pawnIndex());
                })
                .thenComparingInt(m -> switch (m) {
                    case Move.Place p -> p.steps();
                    case Move.Step s -> s.steps();
                }));

        for (int i = 0; i < sorted.size(); i++) {
            Move m = sorted.get(i);
            int display = switch (m) {
                case Move.Place ignored -> 0;
                case Move.Step s -> numbers.get(s.pawnIndex());
            };
            System.out.println("  " + (i + 1) + ". "
                    + formatMove(state, m, playerIndex, myColor, config, display));
        }

        int choice = readNumber(1, sorted.size());
        return sorted.get(choice - 1);
    }

    private String formatMove(GameState state, Move move, int playerIndex,
                                PlayerColor myColor, GameConfig config, int displayNumber) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        boolean kill = target.occupantPlayerIndex() != null
                && target.occupantPlayerIndex() != playerIndex;

        if (move instanceof Move.Place place) {
            if (place.steps() == 0) {
                return kill ? Messages.get("move.placeKill") : Messages.get("move.place");
            }
            return kill ? Messages.get("move.placeMoveKill", place.steps())
                        : Messages.get("move.placeMove", place.steps());
        }
        Move.Step step = (Move.Step) move;

        StringBuilder sb = new StringBuilder();
        sb.append(Messages.get("move.pawn", move.playerIndex(),
                displayNumber, step.steps()));
        if (kill) sb.append(Messages.get("move.kill"));
        if (target.type() == Cell.CellType.HOME) sb.append(Messages.get("move.home"));
        if (isWinningMove(state, move, playerIndex, config)) sb.append(Messages.get("move.win"));
        return sb.toString();
    }

    private boolean isWinningMove(GameState state, Move move, int playerIndex, GameConfig config) {
        return WinChecker.isWinningSnapshotMove(state, move, playerIndex, config);
    }

    private int readNumber(int min, int max) {
        while (true) {
            try {
                System.out.print(Messages.get("prompt.choose"));
                String line = reader.readLine();
                if (line == null) {
                    throw new IllegalStateException(
                            "Console input stream closed (no interactive terminal). " +
                            "Run with an attached console, e.g. `gradlew run --no-daemon`.");
                }
                int num = Integer.parseInt(line.trim());
                if (num >= min && num <= max) return num;
                System.out.println(Messages.get("prompt.range", min, max));
            } catch (NumberFormatException e) {
                System.out.println(Messages.get("prompt.invalid"));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }
}
