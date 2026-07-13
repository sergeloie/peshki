package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.PlayerColor;

import javax.swing.*;
import java.awt.*;

public class BoardPanel extends JPanel {

    static final int CELL_SIZE = 80;
    static final int BOARD_X = 20;
    static final int BOARD_Y = 20;

    private GameState state;

    public BoardPanel() {
        setPreferredSize(new Dimension(BOARD_X * 2 + 8 * CELL_SIZE, BOARD_Y * 2 + 8 * CELL_SIZE));
        setBackground(new Color(30, 30, 40));
    }

    public void updateState(GameState state) {
        this.state = state;
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        if (state == null) return;
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        for (GameState.CellState c : state.cells()) {
            int x = BOARD_X + c.x() * CELL_SIZE;
            int y = BOARD_Y + c.y() * CELL_SIZE;

            Color fill = switch (c.type()) {
                case CORNER -> withAlpha(color(c.occupantColor() != null
                        ? c.occupantColor() : playerColorOf(c)), 0.55f);
                case HOME -> withAlpha(color(c.occupantColor() != null
                        ? c.occupantColor() : playerColorOf(c)), 0.4f);
                case FIELD -> new Color(82, 82, 97);
            };
            g2.setColor(fill);
            g2.fillRect(x, y, CELL_SIZE, CELL_SIZE);

            if (c.occupantPawnNumber() != null) {
                // White background circle
                g2.setColor(Color.WHITE);
                g2.fillOval(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
                // Colored circle
                g2.setColor(color(c.occupantColor()));
                g2.fillOval(x + 8, y + 8, CELL_SIZE - 16, CELL_SIZE - 16);
                // Black outline
                g2.setColor(Color.BLACK);
                g2.setStroke(new BasicStroke(2f));
                g2.drawOval(x + 8, y + 8, CELL_SIZE - 16, CELL_SIZE - 16);
                // Pawn number
                g2.setColor(Color.WHITE);
                g2.setFont(new Font("SansSerif", Font.BOLD, 18));
                FontMetrics fm = g2.getFontMetrics();
                String text = String.valueOf(c.occupantPawnNumber());
                int tx = x + (CELL_SIZE - fm.stringWidth(text)) / 2;
                int ty = y + (CELL_SIZE + fm.getAscent() - fm.getDescent()) / 2;
                g2.drawString(text, tx, ty);
            }
        }
    }

    private PlayerColor playerColorOf(GameState.CellState c) {
        if (c.ownerPlayerNumber() != null) {
            return PlayerColor.forIndex(c.ownerPlayerNumber() - 1);
        }
        return PlayerColor.RED;
    }

    static Color color(PlayerColor c) {
        return switch (c) {
            case RED -> new Color(217, 56, 56);
            case GREEN -> new Color(56, 178, 82);
            case YELLOW -> new Color(235, 204, 56);
            case BLUE -> new Color(56, 107, 217);
        };
    }

    private static Color withAlpha(Color base, float a) {
        return new Color(base.getRed(), base.getGreen(), base.getBlue(), (int) (a * 255));
    }
}
