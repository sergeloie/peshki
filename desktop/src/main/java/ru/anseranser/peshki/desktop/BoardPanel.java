package ru.anseranser.peshki.desktop;

import ru.anseranser.peshki.engine.DisplayNumbers;
import ru.anseranser.peshki.engine.GameState;
import ru.anseranser.peshki.engine.PlayerColor;

import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private Anim currentAnim;
    private Timer animTimer;

    /** One pawn animation: growing spawn or a walk along pixel waypoints. */
    private static final class Anim {
        final int playerIndex;
        final int pawnIndex;
        final List<Point> waypoints;
        final long startNanos;
        final long stepNanos;
        final boolean spawn;

        Anim(int playerIndex, int pawnIndex, List<Point> waypoints,
             long stepNanos, boolean spawn) {
            this.playerIndex = playerIndex;
            this.pawnIndex = pawnIndex;
            this.waypoints = waypoints;
            this.startNanos = System.nanoTime();
            this.stepNanos = stepNanos;
            this.spawn = spawn;
        }

        long totalNanos() {
            return spawn ? stepNanos : stepNanos * (waypoints.size() - 1);
        }

        boolean finished() {
            return System.nanoTime() - startNanos >= totalNanos();
        }
    }

    /** Pixel center of a cell, or null when the board state is unknown. */
    public Point cellCenter(int cellIndex) {
        if (state == null) {
            return null;
        }
        for (GameState.CellState c : state.cells()) {
            if (c.index() == cellIndex) {
                return new Point(BOARD_X + c.x() * CELL_SIZE + CELL_SIZE / 2,
                        BOARD_Y + c.y() * CELL_SIZE + CELL_SIZE / 2);
            }
        }
        return null;
    }

    /** Appear as a circle growing from 0 to full size. */
    public void animateSpawn(int cellIndex, int playerIndex, int pawnIndex, long durationMs) {
        Point center = cellCenter(cellIndex);
        if (center == null) {
            return;
        }
        currentAnim = new Anim(playerIndex, pawnIndex, List.of(center),
                durationMs * 1_000_000L, true);
        startAnimTimer();
    }

    /** Walk smoothly through the given pixel waypoints. */
    public void animateMove(int playerIndex, int pawnIndex,
                            List<Point> waypoints, long stepMs) {
        if (waypoints.size() < 2) {
            return;
        }
        currentAnim = new Anim(playerIndex, pawnIndex,
                new ArrayList<>(waypoints), stepMs * 1_000_000L, false);
        startAnimTimer();
    }

    public boolean isAnimating() {
        return currentAnim != null && !currentAnim.finished();
    }

    public void clearAnimation() {
        currentAnim = null;
        stopAnimTimer();
        repaint();
    }

    private void startAnimTimer() {
        stopAnimTimer();
        animTimer = new Timer(33, e -> {
            if (currentAnim == null || currentAnim.finished()) {
                stopAnimTimer();
            }
            repaint();
        });
        animTimer.start();
    }

    private void stopAnimTimer() {
        if (animTimer != null) {
            animTimer.stop();
            animTimer = null;
        }
    }

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

            // Draw pawns (the animated pawn is drawn separately, on top)
            if (c.occupantPawnIndex() != null && !isAnimated(c)) {
                drawPawnAt(g2, x + CELL_SIZE / 2, y + CELL_SIZE / 2, 1.0,
                        color(c.occupantColor()),
                        String.valueOf(
                                numbers.get(c.occupantPlayerIndex()).get(c.occupantPawnIndex())));
            }
        }

        drawAnimation(g2);
    }

    private boolean isAnimated(GameState.CellState c) {
        return currentAnim != null
                && c.occupantPlayerIndex() != null
                && c.occupantPlayerIndex() == currentAnim.playerIndex
                && c.occupantPawnIndex() != null
                && c.occupantPawnIndex() == currentAnim.pawnIndex;
    }

    private void drawAnimation(Graphics2D g2) {
        if (currentAnim == null || state == null) {
            return;
        }
        long elapsed = System.nanoTime() - currentAnim.startNanos;
        double progress = Math.min(1.0, (double) elapsed / currentAnim.totalNanos());

        String number = "?";
        Color pawnColor = Color.GRAY;
        for (GameState.PlayerState ps : state.players()) {
            if (ps.playerIndex() == currentAnim.playerIndex) {
                pawnColor = color(ps.color());
                Integer n = DisplayNumbers.assign(ps.pawns()).get(currentAnim.pawnIndex);
                if (n != null) {
                    number = String.valueOf(n);
                }
            }
        }

        if (currentAnim.spawn) {
            Point center = currentAnim.waypoints.get(0);
            // Ease-out growth: fast start, soft landing on full size.
            double scale = 1.0 - Math.pow(1.0 - progress, 2.0);
            drawPawnAt(g2, center.x, center.y, Math.max(0.01, scale), pawnColor, number);
        } else {
            int segments = currentAnim.waypoints.size() - 1;
            double exact = progress * segments;
            int seg = Math.min(segments - 1, (int) exact);
            double local = exact - seg;
            Point a = currentAnim.waypoints.get(seg);
            Point b = currentAnim.waypoints.get(seg + 1);
            int cx = (int) (a.x + (b.x - a.x) * local);
            int cy = (int) (a.y + (b.y - a.y) * local);
            drawPawnAt(g2, cx, cy, 1.0, pawnColor, number);
        }
    }

    private static void drawPawnAt(Graphics2D g2, int cx, int cy,
                                   double scale, Color pawnColor, String number) {
        int outer = (int) ((CELL_SIZE - 8) * scale);
        int inner = (int) ((CELL_SIZE - 16) * scale);
        // White background circle
        g2.setColor(Color.WHITE);
        g2.fillOval(cx - outer / 2, cy - outer / 2, outer, outer);
        // Colored circle
        g2.setColor(pawnColor);
        g2.fillOval(cx - inner / 2, cy - inner / 2, inner, inner);
        // Black outline
        g2.setColor(Color.BLACK);
        g2.setStroke(new BasicStroke(2f));
        g2.drawOval(cx - inner / 2, cy - inner / 2, inner, inner);
        // Pawn number (#1 = closest to home)
        if (scale > 0.5) {
            g2.setColor(Color.WHITE);
            g2.setFont(new Font("SansSerif", Font.BOLD, (int) (18 * scale)));
            FontMetrics fm = g2.getFontMetrics();
            int tx = cx - fm.stringWidth(number) / 2;
            int ty = cy + (fm.getAscent() - fm.getDescent()) / 2;
            g2.drawString(number, tx, ty);
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
