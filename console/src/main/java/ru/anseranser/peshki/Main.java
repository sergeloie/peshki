package ru.anseranser.peshki;

import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.i18n.Messages;
import ru.anseranser.peshki.input.InputService;
import ru.anseranser.peshki.input.MoveCommand;
import ru.anseranser.peshki.output.OutputService;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class Main {

    public static void main(String[] args) {
        applyLocaleArg(args);
        GameConfig config = GameConfig.DEFAULT;
        GameEngine engine = new GameEngine(config);
        if (System.console() == null) {
            System.out.println(Messages.get("console.noTerminal"));
            return;
        }
        runGame(engine, new ConsoleInput(), new ConsoleOutput());
    }

    /**
     * Drives a full game to completion. Extracted from {@link #main} so it can be
     * exercised by tests with injected input/output and a deterministic engine.
     */
    static void runGame(GameEngine engine, InputService input, OutputService output) {
        GameConfig config = engine.getConfig();
        GameSession session = new GameSession(engine);
        session.addListener(e -> output.onEvents(List.of(e)));

        int turnCount = 0;
        while (!session.isGameOver() && turnCount < config.maxTurns()) {
            turnCount++;
            GameState state = session.getState();
            int playerIndex = session.getCurrentPlayerIndex();
            GameState.PlayerState current = state.players().get(playerIndex);

            output.onTurnHeader(turnCount, current.number(), current.human());

            session.rollDice();

            boolean extraTurn;
            if (current.human()) {
                extraTurn = executeHumanTurn(session, input, output);
                session.advancePlayer(extraTurn);
            } else {
                String[] beforeLines = output.snapshotBoard(session.getState());
                List<GameEvent> events = session.playBotTurn();
                extraTurn = events.stream().anyMatch(e ->
                        e instanceof GameEvent.TurnEnded te && te.extraTurn());
                output.onBoardBeforeAfter(beforeLines, output.snapshotBoard(session.getState()));
            }

            if (session.isGameOver()) {
                output.onBoard(session.getState());
                output.onGameWon(session.getState().winnerPlayerNumber());
                return;
            }
        }
        output.onGameEnded(config.maxTurns());
    }

    private static boolean executeHumanTurn(GameSession session, InputService input, OutputService output) {
        List<Integer> usedDice = new ArrayList<>();
        List<Integer> remainingDice = new ArrayList<>(session.getCurrentDice());
        boolean extraTurn = session.getCurrentDice().contains(6);

        output.onBoard(session.getState());

        while (!remainingDice.isEmpty()) {
            GameState state = session.getState();
            List<Move> availableMoves = session.getAvailableMoves(remainingDice);
            if (availableMoves.isEmpty()) break;

            MoveCommand cmd = input.getMove(state, availableMoves, session.getCurrentDice(),
                    usedDice, session.getState().config());

            String[] beforeLines = output.snapshotBoard(session.getState());
            List<GameEvent> events = session.submitMove(cmd);

            for (GameEvent e : events) {
                if (e instanceof GameEvent.PawnKilled) extraTurn = true;
            }

            updateRemainingDice(remainingDice, usedDice, cmd);

            if (!remainingDice.isEmpty() && !session.isGameOver()) {
                output.onBoardBeforeAfter(beforeLines, output.snapshotBoard(session.getState()));
            }
            if (session.isGameOver()) break;
        }
        return extraTurn;
    }

    private static void applyLocaleArg(String[] args) {
        List<String> tokens = new ArrayList<>();
        for (String a : args) {
            for (String t : a.split("\\s+")) {
                if (!t.isEmpty()) tokens.add(t);
            }
        }
        for (int i = 0; i < tokens.size(); i++) {
            String t = tokens.get(i);
            if (t.equals("--lang") && i + 1 < tokens.size()) {
                Messages.setLocale(new Locale.Builder().setLanguage(tokens.get(i + 1)).build());
                return;
            }
            if (t.startsWith("--lang=")) {
                Messages.setLocale(new Locale.Builder().setLanguage(t.substring("--lang=".length())).build());
                return;
            }
        }
    }

    private static void updateRemainingDice(List<Integer> remainingDice, List<Integer> usedDice, MoveCommand command) {
        switch (command) {
            case MoveCommand.PlacePawn c -> {
                remainingDice.remove(Integer.valueOf(c.diceValue()));
                usedDice.add(c.diceValue());
            }
            case MoveCommand.MovePawn c -> {
                for (int d : c.consumedDice()) {
                    remainingDice.remove(Integer.valueOf(d));
                    usedDice.add(d);
                }
            }
            case MoveCommand.PlaceAndMove c -> {
                remainingDice.remove(Integer.valueOf(c.placeDice()));
                remainingDice.remove(Integer.valueOf(c.moveDice()));
                usedDice.add(c.placeDice());
                usedDice.add(c.moveDice());
            }
        }
    }
}
