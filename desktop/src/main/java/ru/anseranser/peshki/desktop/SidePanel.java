package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.Move;
import ru.anseranser.peshki.engine.Pawn;

import javax.swing.*;
import java.awt.*;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Consumer;

public class SidePanel extends JPanel {

    private final JLabel statusLabel = new JLabel(" ");
    private final JLabel diceLabel = new JLabel(" ");
    private final JPanel movesPanel = new JPanel();
    private final JPanel benchPanel = new JPanel();

    public SidePanel() {
        setPreferredSize(new Dimension(300, 0));
        setLayout(new BoxLayout(this, BoxLayout.Y_AXIS));
        setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        statusLabel.setFont(new Font("SansSerif", Font.BOLD, 16));
        statusLabel.setAlignmentX(LEFT_ALIGNMENT);
        add(statusLabel);

        add(Box.createVerticalStrut(8));

        diceLabel.setFont(new Font("SansSerif", Font.PLAIN, 14));
        diceLabel.setAlignmentX(LEFT_ALIGNMENT);
        add(diceLabel);

        add(Box.createVerticalStrut(12));
        add(createSeparator());
        add(Box.createVerticalStrut(8));

        JLabel movesHeader = new JLabel("Moves:");
        movesHeader.setFont(new Font("SansSerif", Font.BOLD, 14));
        movesHeader.setAlignmentX(LEFT_ALIGNMENT);
        add(movesHeader);

        add(Box.createVerticalStrut(4));

        movesPanel.setLayout(new BoxLayout(movesPanel, BoxLayout.Y_AXIS));
        movesPanel.setAlignmentX(LEFT_ALIGNMENT);
        JScrollPane movesScroll = new JScrollPane(movesPanel);
        movesScroll.setAlignmentX(LEFT_ALIGNMENT);
        movesScroll.setBorder(null);
        movesScroll.setMaximumSize(new Dimension(280, 250));
        add(movesScroll);

        add(Box.createVerticalStrut(8));
        add(createSeparator());
        add(Box.createVerticalStrut(8));

        JLabel benchHeader = new JLabel("Bench:");
        benchHeader.setFont(new Font("SansSerif", Font.BOLD, 14));
        benchHeader.setAlignmentX(LEFT_ALIGNMENT);
        add(benchHeader);

        add(Box.createVerticalStrut(4));

        benchPanel.setLayout(new BoxLayout(benchPanel, BoxLayout.Y_AXIS));
        benchPanel.setAlignmentX(LEFT_ALIGNMENT);
        add(benchPanel);

        add(Box.createVerticalGlue());
    }

    public void update(GameState state, List<Move> moves, int turnCount, boolean isBotTurn, Consumer<Move> onMoveClick) {
        // Status + turn counter
        if (state.gameOver()) {
            statusLabel.setText("Player " + state.winnerPlayerNumber() + " WINS!");
            statusLabel.setForeground(new Color(255, 215, 0));
        } else {
            GameState.PlayerState cur = state.players().get(state.currentPlayerIndex());
            String text = "Turn " + turnCount + ": Player " + cur.number()
                    + (cur.human() ? " (you)" : " (bot)");
            statusLabel.setText(text);
            statusLabel.setForeground(cur.human() ? new Color(100, 200, 100) : Color.WHITE);
        }

        // Dice — always show
        StringBuilder diceText = new StringBuilder("Dice: ");
        for (int v : state.currentDice()) {
            diceText.append("[").append(v).append("] ");
        }
        diceLabel.setText(diceText.toString());

        // Move buttons — hidden during bot turns
        movesPanel.removeAll();
        if (isBotTurn) {
            JLabel botLabel = new JLabel("Bot is thinking...");
            botLabel.setForeground(Color.GRAY);
            movesPanel.add(botLabel);
        } else if (moves.isEmpty()) {
            JLabel noMoves = new JLabel("No moves available");
            noMoves.setForeground(Color.GRAY);
            movesPanel.add(noMoves);
        } else {
            List<Move> sorted = new ArrayList<>(moves);
            sorted.sort(Comparator
                    .comparing((Move m) -> m.pawn() == null ? 0 : m.pawn().getNumber())
                    .thenComparingInt(Move::steps));
            for (Move move : sorted) {
                MoveButton btn = new MoveButton(formatMove(state, move,
                        state.players().get(state.currentPlayerIndex()).number()));
                btn.addActionListener(e -> onMoveClick.accept(move));
                movesPanel.add(btn);
                movesPanel.add(Box.createVerticalStrut(2));
            }
        }
        movesPanel.revalidate();
        movesPanel.repaint();

        // Bench
        benchPanel.removeAll();
        for (GameState.PlayerState ps : state.players()) {
            JPanel row = new JPanel(new FlowLayout(FlowLayout.LEFT, 2, 2));
            row.setMaximumSize(new Dimension(280, 50));
            row.setAlignmentX(LEFT_ALIGNMENT);

            JLabel label = new JLabel("P" + ps.number() + ":");
            label.setForeground(BoardPanel.color(ps.color()));
            label.setFont(new Font("SansSerif", Font.BOLD, 12));
            row.add(label);

            for (GameState.PawnState pw : ps.pawns()) {
                if (pw.state() != Pawn.State.BENCH) continue;
                JLabel icon = createPieceIcon(ps.color(), pw.number());
                row.add(icon);
            }
            benchPanel.add(row);
        }
        benchPanel.revalidate();
        benchPanel.repaint();
    }

    private String formatMove(GameState state, Move move, int playerNumber) {
        GameState.CellState target = state.cells().get(move.targetCellIndex());
        boolean kill = target.occupantPlayerNumber() != null
                && target.occupantPlayerNumber() != playerNumber;
        boolean home = target.type() == ru.anseranser.peshki.engine.Cell.CellType.HOME;

        if (move.pawn() == null) {
            String base = move.consumedDice().size() == 2
                    ? "Place & move " + move.steps() + " steps"
                    : "Place new pawn";
            if (kill) base += " (KILL!)";
            return base;
        }
        String base = "Pawn #" + move.pawn().getNumber() + " \u2192 " + move.steps() + " steps";
        if (kill) base += " (KILL!)";
        if (home) base += " \u2191 HOME";
        return base;
    }

    private JLabel createPieceIcon(ru.anseranser.peshki.engine.PlayerColor pc, int number) {
        JLabel label = new JLabel(" " + number + " ") {
            @Override
            protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g;
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g2.setColor(BoardPanel.color(pc));
                g2.fillOval(0, 0, 28, 28);
                g2.setColor(Color.BLACK);
                g2.setStroke(new BasicStroke(1.5f));
                g2.drawOval(0, 0, 28, 28);
                g2.setColor(Color.WHITE);
                g2.setFont(new Font("SansSerif", Font.BOLD, 12));
                FontMetrics fm = g2.getFontMetrics();
                String t = String.valueOf(number);
                g2.drawString(t, (28 - fm.stringWidth(t)) / 2, (28 + fm.getAscent() - fm.getDescent()) / 2);
            }

            @Override
            public Dimension getPreferredSize() {
                return new Dimension(28, 28);
            }
        };
        return label;
    }

    private JSeparator createSeparator() {
        JSeparator sep = new JSeparator(SwingConstants.HORIZONTAL);
        sep.setMaximumSize(new Dimension(280, 2));
        sep.setAlignmentX(LEFT_ALIGNMENT);
        return sep;
    }
}
