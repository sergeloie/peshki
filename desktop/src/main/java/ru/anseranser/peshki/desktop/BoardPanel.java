package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.engine.DisplayNumbers;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.PlayerColor;

import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.HashMap;
import java.util.Map;

public class BoardPanel extends JPanel {

    static final int CELL_SIZE = 80;
    static final int BOARD_X = 20;
    static final int BOARD_Y = 20;

    private static final Color LIGHT_SQUARE = new Color(238, 238, 210);
    private static final Color DARK_SQUARE = new Color(118, 150, 86);

    private GameState state;
    private BufferedImage boardTexture;

    public BoardPanel() {
        setPreferredSize(new Dimension(BOARD_X * 2 + 8 * CELL_SIZE, BOARD_Y * 2 + 8 * CELL_SIZE));
        setBackground(new Color(30, 30, 40));
    }

    public void updateState(GameState state) {
        this.state = state;
        if (boardTexture == null || boardTexture.getWidth() != getWidth() || boardTexture.getHeight() != getHeight()) {
            boardTexture = new BufferedImage(getWidth(), getHeight(), BufferedImage.TYPE_INT_ARGB);
            renderBoardTexture();
        }
        repaint();
    }

    private void renderBoardTexture() {
        if (boardTexture == null) return;
        Graphics2D g2 = boardTexture.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Draw chess board pattern for all 8x8 cells
        for (int row = 0; row < 8; row++) {
            for (int col = 0; col < 8; col++) {
                int x = BOARD_X + col * CELL_SIZE;
                int y = BOARD_Y + row * CELL_SIZE;
                boolean isLight = (row + col) % 2 == 0;
                g2.setColor(isLight ? LIGHT_SQUARE : DARK_SQUARE);
                g2.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }

        g2.dispose();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        if (state == null) return;
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        // Draw board texture
        if (boardTexture != null) {
            g2.drawImage(boardTexture, 0, 0, null);
        }

        // Overlay corner and home cell highlights
        Map<Integer, Map<Integer, Integer>> numbers = new HashMap<>();
        for (GameState.PlayerState ps : state.players()) {
            numbers.put(ps.playerIndex(), DisplayNumbers.assign(ps.pawns()));
        }
        for (GameState.CellState c : state.cells()) {
            int x = BOARD_X + c.x() * CELL_SIZE;
            int y = BOARD_Y + c.y() * CELL_SIZE;

            switch (c.type()) {
                case CORNER -> {
                    Color fill = withAlpha(color(c.occupantColor() != null
                            ? c.occupantColor() : playerColorOf(c)), 0.55f);
                    g2.setColor(fill);
                    g2.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }
                case HOME -> {
                    Color fill = withAlpha(color(c.occupantColor() != null
                            ? c.occupantColor() : playerColorOf(c)), 0.4f);
                    g2.setColor(fill);
                    g2.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }
                case FIELD -> {
                    // Chess board pattern already drawn from texture
                }
            }

            // Draw pawns
            if (c.occupantPawnIndex() != null) {
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
                // Pawn number (#1 = closest to home)
                g2.setColor(Color.WHITE);
                g2.setFont(new Font("SansSerif", Font.BOLD, 18));
                FontMetrics fm = g2.getFontMetrics();
                String text = String.valueOf(
                        numbers.get(c.occupantPlayerIndex()).get(c.occupantPawnIndex()));
                int tx = x + (CELL_SIZE - fm.stringWidth(text)) / 2;
                int ty = y + (CELL_SIZE + fm.getAscent() - fm.getDescent()) / 2;
                g2.drawString(text, tx, ty);
            }
        }
    }

    private PlayerColor playerColorOf(GameState.CellState c) {
        if (c.ownerPlayerIndex() != null) {
            return PlayerColor.forIndex(c.ownerPlayerIndex());
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
