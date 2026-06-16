package ru.anseranser.peshki;

import ru.anseranser.peshki.engine.*;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.InputService;
import ru.anseranser.peshki.input.MoveCommand;
import ru.anseranser.peshki.output.OutputService;
import ru.anseranser.peshki.ui.console.ConsoleInput;
import ru.anseranser.peshki.ui.console.ConsoleOutput;

import java.util.ArrayList;
import java.util.List;

public class Main {

    public static void main(String[] args) {
        GameConfig config = GameConfig.DEFAULT;
        GameEngine engine = new GameEngine(config);
        OutputService output = new ConsoleOutput();
        InputService input = new ConsoleInput();

        int turnCount = 0;
        while (!engine.isGameOver() && turnCount < config.maxTurns()) {
            turnCount++;
            Player currentPlayer = engine.getBoard().getPlayers().get(engine.getCurrentPlayerIndex());

            output.onTurnHeader(turnCount, currentPlayer.getNumber(), currentPlayer.isHuman());

            List<Integer> dice = engine.rollDice();
            output.onEvents(List.of(new GameEvent.DiceRolled(currentPlayer.getNumber(), dice)));

            boolean extraTurn;

            if (currentPlayer.isHuman()) {
                extraTurn = executeHumanTurn(engine, input, output);
            } else {
                String[] beforeLines = output.snapshotBoard(engine.getBoard());
                List<GameEvent> events = engine.executeBotTurn();
                output.onEvents(events);
                extraTurn = events.stream().anyMatch(e ->
                        e instanceof GameEvent.TurnEnded te && te.extraTurn());
                output.onBoardBeforeAfter(beforeLines, output.snapshotBoard(engine.getBoard()));
            }

            if (engine.isGameOver()) {
                output.onBoard(engine.getBoard());
                Player winner = engine.getBoard().getPlayers().get(engine.getCurrentPlayerIndex());
                output.onGameWon(winner.getNumber());
                return;
            }
        }
        output.onGameEnded(config.maxTurns());
    }

    private static boolean executeHumanTurn(GameEngine engine, InputService input, OutputService output) {
        List<Integer> usedDice = new ArrayList<>();
        List<Integer> remainingDice = new ArrayList<>(engine.getCurrentDice());
        boolean extraTurn = engine.getCurrentDice().contains(6);

        engine.incrementTurn();
        output.onBoard(engine.getBoard());

        while (!remainingDice.isEmpty()) {
            Player player = engine.getBoard().getPlayers().get(engine.getCurrentPlayerIndex());
            List<Move> availableMoves = GameEngine.generateAllMoves(
                    player, remainingDice, engine.getBoard(), engine.getConfig());
            if (availableMoves.isEmpty()) break;

            MoveCommand cmd = input.getMove(player, availableMoves, engine.getBoard(),
                    engine.getCurrentDice(), usedDice, engine.getConfig());

            String[] beforeLines = output.snapshotBoard(engine.getBoard());
            List<GameEvent> events = engine.executeHumanCommand(cmd, usedDice);
            output.onEvents(events);

            for (GameEvent e : events) {
                if (e instanceof GameEvent.PawnKilled) extraTurn = true;
            }

            updateRemainingDice(remainingDice, usedDice, cmd);

            if (!remainingDice.isEmpty() && !engine.isGameOver()) {
                output.onBoardBeforeAfter(beforeLines, output.snapshotBoard(engine.getBoard()));
            }

            if (engine.isGameOver()) break;
        }

        engine.advancePlayer(extraTurn);
        return extraTurn;
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
