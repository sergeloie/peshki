package ru.anseranser.peshki;

import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameEngine;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.i18n.Messages;
import ru.anseranser.peshki.input.InputService;
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

    static void runGame(GameEngine engine, InputService input, OutputService output) {
        GameConfig config = engine.getConfig();
        GameSession session = new GameSession(engine);
        // Player 0 is human (blocking prompts); the rest are bots.
        // Any seat can be swapped mid-game via setController — same interface.
        session.setController(0, new HumanSelector(input), true);
        session.addListener(e -> output.onEvents(List.of(e)));

        int turnCount = 0;
        while (!session.isGameOver() && turnCount < config.maxTurns()) {
            turnCount++;
            GameState state = session.getState();
            int playerIndex = session.getCurrentPlayerIndex();
            GameState.PlayerState current = state.players().get(playerIndex);

            output.onTurnHeader(turnCount, current.playerIndex(), current.human());

            String[] beforeLines = output.snapshotBoard(session.getState());
            session.rollDice();
            session.playCurrentTurn();
            output.onBoardBeforeAfter(beforeLines, output.snapshotBoard(session.getState()));

            if (session.isGameOver()) {
                output.onBoard(session.getState());
                output.onGameWon(session.getState().winnerPlayerIndex());
                return;
            }
        }
        output.onGameEnded(config.maxTurns());
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
}
