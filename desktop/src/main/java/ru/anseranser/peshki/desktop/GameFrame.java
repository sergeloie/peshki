package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;

import javax.swing.*;
import java.awt.*;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class GameFrame extends JFrame {

    private final GameSession session;
    private final BoardPanel boardPanel;
    private final SidePanel sidePanel;
    private final int botDelayMs;

    private int turnCount = 0;
    private List<Integer> remainingDice = new ArrayList<>();
    private List<Integer> usedDice = new ArrayList<>();
    private boolean extraTurn;

    public GameFrame() {
        super("Peshki");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setResizable(false);

        botDelayMs = loadBotDelay();

        session = new GameSession(GameConfig.DEFAULT);
        session.addListener(this::onEvent);

        boardPanel = new BoardPanel();
        sidePanel = new SidePanel();

        setLayout(new BorderLayout());
        add(boardPanel, BorderLayout.CENTER);
        add(sidePanel, BorderLayout.EAST);

        pack();
        setLocationRelativeTo(null);

        refresh();
        SwingUtilities.invokeLater(this::gameLoop);
    }

    private int loadBotDelay() {
        try (InputStream in = getClass().getResourceAsStream("/desktop.properties")) {
            if (in != null) {
                Properties props = new Properties();
                props.load(in);
                return Integer.parseInt(props.getProperty("bot.delay.ms", "800"));
            }
        } catch (IOException | NumberFormatException e) {
            // Fall back to default
        }
        return 800;
    }

    private void onEvent(GameEvent e) {
        if (e instanceof GameEvent.PawnKilled) extraTurn = true;
    }

    private void refresh() {
        GameState state = session.getState();
        boardPanel.updateState(state);

        boolean isBotTurn = !state.gameOver()
                && !state.players().get(state.currentPlayerIndex()).human();

        List<Move> moves = List.of();
        if (!isBotTurn && !state.gameOver() && !remainingDice.isEmpty()) {
            moves = session.getAvailableMoves(remainingDice);
        }

        sidePanel.update(state, moves, turnCount, isBotTurn, this::onMoveClick);
    }

    private void onMoveClick(Move move) {
        int playerNumber = session.getState().players().get(session.getCurrentPlayerIndex()).number();

        MoveCommand cmd;
        if (move.pawn() == null) {
            cmd = move.steps() == 0
                    ? new MoveCommand.PlacePawn(playerNumber, 6)
                    : new MoveCommand.PlaceAndMove(playerNumber, 6, move.steps());
        } else {
            cmd = new MoveCommand.MovePawn(playerNumber, move.pawn().getNumber(),
                    move.steps(), move.consumedDice());
        }
        session.submitMove(cmd);

        updateRemainingDice(cmd);

        if (!session.isGameOver() && !remainingDice.isEmpty()) {
            List<Move> moreMoves = session.getAvailableMoves(remainingDice);
            if (!moreMoves.isEmpty()) {
                refresh();
                return;
            }
        }

        session.advancePlayer(extraTurn);
        extraTurn = false;
        remainingDice.clear();
        usedDice.clear();

        refresh();

        if (!session.isGameOver()) {
            SwingUtilities.invokeLater(this::gameLoop);
        } else {
            JOptionPane.showMessageDialog(this,
                    "Player " + session.getState().winnerPlayerNumber() + " wins!",
                    "Game Over", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    private void gameLoop() {
        if (session.isGameOver()) {
            refresh();
            JOptionPane.showMessageDialog(this,
                    "Player " + session.getState().winnerPlayerNumber() + " wins!",
                    "Game Over", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        GameState state = session.getState();
        GameState.PlayerState current = state.players().get(state.currentPlayerIndex());
        turnCount++;

        if (!current.human()) {
            session.rollDice();
            refresh();
            Timer timer = new Timer(botDelayMs, e -> {
                session.playBotTurn();
                extraTurn = false;
                remainingDice.clear();
                usedDice.clear();
                refresh();
                if (!session.isGameOver()) {
                    SwingUtilities.invokeLater(this::gameLoop);
                }
            });
            timer.setRepeats(false);
            timer.start();
            return;
        }

        session.rollDice();
        extraTurn = session.getCurrentDice().contains(6);
        remainingDice = new ArrayList<>(session.getCurrentDice());
        usedDice = new ArrayList<>();
        refresh();

        List<Move> moves = session.getAvailableMoves(remainingDice);
        if (moves.isEmpty()) {
            session.advancePlayer(extraTurn);
            extraTurn = false;
            remainingDice.clear();
            usedDice.clear();
            refresh();
            if (!session.isGameOver()) {
                SwingUtilities.invokeLater(this::gameLoop);
            }
        }
    }

    private void updateRemainingDice(MoveCommand cmd) {
        switch (cmd) {
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
