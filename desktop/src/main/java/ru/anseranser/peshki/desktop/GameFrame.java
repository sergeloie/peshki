package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.event.GameEvent;

import javax.swing.*;
import java.awt.*;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Properties;

public class GameFrame extends JFrame {

    private final GameSession session;
    private final BoardPanel boardPanel;
    private final SidePanel sidePanel;
    private final int botDelayMs;

    private int turnCount = 0;

    public GameFrame() {
        super("Peshki");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setResizable(false);

        botDelayMs = loadBotDelay();

        session = new GameSession(GameConfig.DEFAULT);
        // Player 0 is click-driven; its controller stays idle unless
        // playCurrentTurn is ever called (e.g. after a mid-game swap to bot).
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

    private void refresh() {
        GameState state = session.getState();
        boardPanel.updateState(state);

        boolean isBotTurn = !state.gameOver()
                && !state.players().get(state.currentPlayerIndex()).human();

        List<Move> moves = List.of();
        if (!isBotTurn && !state.gameOver()) {
            moves = session.getAvailableMoves();
        }

        sidePanel.update(state, moves, turnCount, isBotTurn, this::onMoveClick);
    }

    private void onMoveClick(Move move) {
        List<GameEvent> events = session.submitMove(move);
        refresh();

        if (session.isGameOver()) {
            JOptionPane.showMessageDialog(this,
                    "Player " + session.getState().winnerPlayerIndex() + " wins!",
                    "Game Over", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        boolean turnEnded = events.stream()
                .anyMatch(e -> e instanceof GameEvent.TurnEnded);
        if (turnEnded) {
            SwingUtilities.invokeLater(this::gameLoop);
        }
    }

    private void gameLoop() {
        if (session.isGameOver()) {
            refresh();
            JOptionPane.showMessageDialog(this,
                    "Player " + session.getState().winnerPlayerIndex() + " wins!",
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
                session.playCurrentTurn();
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
        refresh();

        if (session.getAvailableMoves().isEmpty()) {
            session.skipTurn();
            refresh();
            if (!session.isGameOver()) {
                SwingUtilities.invokeLater(this::gameLoop);
            }
        }
        // Otherwise wait for clicks: each onMoveClick submits one move.
    }
}
