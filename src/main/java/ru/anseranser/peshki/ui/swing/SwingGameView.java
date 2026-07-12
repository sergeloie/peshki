package ru.anseranser.peshki.ui.swing;

import ru.anseranser.peshki.controller.GameSession;
import ru.anseranser.peshki.engine.GameConfig;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.event.GameEvent;
import ru.anseranser.peshki.input.MoveCommand;
import ru.anseranser.peshki.ui.console.BoardRenderer;

import javax.swing.*;
import java.awt.*;
import java.util.List;

/**
 * Minimal reference UI (Swing) demonstrating that the game is fully
 * UI-agnostic: it only talks to {@link GameSession} and renders
 * {@link GameState}. This is NOT the production mobile/desktop client — it
 * exists to prove the controller boundary works and to serve as a template.
 */
public class SwingGameView {

    private final GameSession session;
    private final JTextArea boardArea = new JTextArea(22, 42);
    private final JTextArea logArea = new JTextArea(8, 42);
    private final JPanel movesPanel = new JPanel(new GridLayout(0, 1));
    private final JButton rollButton = new JButton("Roll");
    private final JButton botButton = new JButton("Play Bot Turn");
    private boolean awaitingRoll = true;

    public SwingGameView(GameSession session) {
        this.session = session;
        this.boardArea.setEditable(false);
        this.logArea.setEditable(false);
        session.addListener(this::onEvent);
        buildUi();
        refresh();
    }

    private void onEvent(GameEvent e) {
        logArea.append(e.toString() + "\n");
        if (e instanceof GameEvent.TurnEnded) awaitingRoll = true;
        refresh();
    }

    private void refresh() {
        GameState state = session.getState();
        boardArea.setText(String.join("\n", BoardRenderer.render(state)));
        boolean over = session.isGameOver();
        boolean human = !over && state.players().get(session.getCurrentPlayerIndex()).human();
        rollButton.setEnabled(!over && human);
        botButton.setEnabled(!over && !human);
        renderMoves();
    }

    private void renderMoves() {
        movesPanel.removeAll();
        if (awaitingRoll || session.isGameOver()) {
            movesPanel.revalidate();
            return;
        }
        List<Move> moves = session.getAvailableMoves(session.getCurrentDice());
        for (int i = 0; i < moves.size(); i++) {
            Move m = moves.get(i);
            JButton b = new JButton(m.toString());
            b.addActionListener(ev -> submitMove(m));
            movesPanel.add(b);
        }
        movesPanel.revalidate();
    }

    private void submitMove(Move m) {
        GameState state = session.getState();
        int pn = state.players().get(session.getCurrentPlayerIndex()).number();
        MoveCommand cmd;
        if (m.pawn() == null) {
            cmd = m.steps() == 0
                    ? new MoveCommand.PlacePawn(pn, 6)
                    : new MoveCommand.PlaceAndMove(pn, 6, m.steps());
        } else {
            cmd = new MoveCommand.MovePawn(pn, m.pawn().getNumber(), m.steps(), m.consumedDice());
        }
        session.submitMove(cmd);
    }

    private void buildUi() {
        rollButton.addActionListener(ev -> {
            session.rollDice();
            awaitingRoll = false;
            refresh();
        });
        botButton.addActionListener(ev -> {
            while (!session.isGameOver()
                    && !session.getState().players().get(session.getCurrentPlayerIndex()).human()) {
                session.rollDice();
                session.playBotTurn();
            }
        });

        JPanel controls = new JPanel();
        controls.add(rollButton);
        controls.add(botButton);

        JFrame frame = new JFrame("Peshki");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLayout(new BorderLayout());
        frame.add(controls, BorderLayout.NORTH);
        frame.add(new JScrollPane(boardArea), BorderLayout.CENTER);
        frame.add(new JScrollPane(movesPanel), BorderLayout.EAST);
        frame.add(new JScrollPane(logArea), BorderLayout.SOUTH);
        frame.pack();
        frame.setVisible(true);
    }

    public static void main(String[] args) {
        GameSession session = new GameSession(GameConfig.DEFAULT);
        SwingUtilities.invokeLater(() -> new SwingGameView(session));
    }
}
