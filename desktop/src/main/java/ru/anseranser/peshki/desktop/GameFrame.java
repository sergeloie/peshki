package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.BoardTopology;
import ru.anseranser.peshki.engine.DiceSet;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.MoveContext;
import ru.anseranser.peshki.engine.PositionView;
import ru.anseranser.peshki.engine.event.GameEvent;

import javax.swing.*;
import java.awt.*;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class GameFrame extends JFrame {

    private static final long DICE_PAUSE_MS = 700;
    private static final long NO_MOVES_PAUSE_MS = 1500;
    private static final long SPAWN_MS = 450;
    private static final long STEP_MS = 170;

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
        if (boardPanel.isAnimating()) {
            return;
        }
        List<GameEvent> events = session.submitMove(move);
        runSteps(toAnimSteps(events), () -> {
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
        });
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
            Timer timer = new Timer(botDelayMs, e -> botStep());
            timer.setRepeats(false);
            timer.start();
            return;
        }

        session.rollDice();
        refresh();
        // Pause so the rolled dice stay readable before the moves appear.
        Timer dicePause = new Timer((int) DICE_PAUSE_MS, e -> {
            refresh();
            if (session.getAvailableMoves().isEmpty()) {
                // "No moves available" is already on screen — give it time
                // to be read before skipping the turn.
                Timer infoPause = new Timer((int) NO_MOVES_PAUSE_MS, e2 -> {
                    session.skipTurn();
                    refresh();
                    if (!session.isGameOver()) {
                        SwingUtilities.invokeLater(this::gameLoop);
                    }
                });
                infoPause.setRepeats(false);
                infoPause.start();
            }
            // Otherwise wait for clicks: each onMoveClick submits one move.
        });
        dicePause.setRepeats(false);
        dicePause.start();
    }

    /**
     * One atomic bot step: select a single move, apply it, animate it
     * against the pre-step board, then refresh to the post-step board.
     * The victim of a kill stays visible during the travel and disappears
     * exactly on arrival — no ghosts, no jumps.
     */
    private void botStep() {
        if (session.isGameOver()) {
            refresh();
            JOptionPane.showMessageDialog(this,
                    "Player " + session.getState().winnerPlayerIndex() + " wins!",
                    "Game Over", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        List<Move> legal = session.getAvailableMoves();
        if (legal.isEmpty()) {
            session.skipTurn();
            refresh();
            SwingUtilities.invokeLater(this::gameLoop);
            return;
        }
        MoveContext context = new MoveContext(session.getState(),
                PositionView.snapshot(session.getEngine().getBoard()),
                new DiceSet(session.getCurrentDice()),
                session.getRemainingDice());
        Move chosen = session.getController(session.getCurrentPlayerIndex())
                .select(context, legal);
        if (chosen == null) {
            session.skipTurn();
            refresh();
            SwingUtilities.invokeLater(this::gameLoop);
            return;
        }
        List<GameEvent> events = session.submitMove(chosen);
        if (events.stream().anyMatch(e -> e instanceof GameEvent.MoveRejected)) {
            session.skipTurn();
            refresh();
            SwingUtilities.invokeLater(this::gameLoop);
            return;
        }
        runSteps(toAnimSteps(events), () -> {
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
            } else {
                SwingUtilities.invokeLater(this::botStep);
            }
        });
    }

    /** One pawn animation step derived from engine events. */
    private record AnimStep(boolean spawn, int playerIndex, int pawnIndex,
                            List<Integer> path, long totalMs) {}

    private List<AnimStep> toAnimSteps(List<GameEvent> events) {
        List<AnimStep> steps = new ArrayList<>();
        BoardTopology topology = session.getEngine().getBoard().getTopology();
        for (GameEvent e : events) {
            if (e instanceof GameEvent.PawnPlaced p) {
                steps.add(new AnimStep(true, p.playerIndex(), p.pawnIndex(),
                        List.of(p.cellIndex()), SPAWN_MS));
            } else if (e instanceof GameEvent.PawnMoved m) {
                List<Integer> path = AnimationPath.build(
                        topology, m.fromCell(), m.toCell(), m.playerIndex());
                steps.add(new AnimStep(false, m.playerIndex(), m.pawnIndex(),
                        path, STEP_MS * Math.max(1, path.size() - 1)));
            }
        }
        return steps;
    }

    /** Plays animation steps one by one, then runs onDone on the EDT. */
    private void runSteps(List<AnimStep> steps, Runnable onDone) {
        if (steps.isEmpty()) {
            boardPanel.clearAnimation();
            onDone.run();
            return;
        }
        AnimStep step = steps.remove(0);
        if (step.spawn()) {
            boardPanel.animateSpawn(step.path().get(0),
                    step.playerIndex(), step.pawnIndex(), step.totalMs());
        } else {
            List<Point> waypoints = new ArrayList<>();
            for (int cellIndex : step.path()) {
                Point center = boardPanel.cellCenter(cellIndex);
                if (center != null) {
                    waypoints.add(center);
                }
            }
            if (waypoints.size() >= 2) {
                boardPanel.animateMove(step.playerIndex(), step.pawnIndex(),
                        waypoints, STEP_MS);
            }
        }
        Timer timer = new Timer((int) step.totalMs() + 80, e -> runSteps(steps, onDone));
        timer.setRepeats(false);
        timer.start();
    }
}
