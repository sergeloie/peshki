package ru.anseranser.peshki.desktop;

import com.formdev.flatlaf.FlatDarkLaf;

import javax.swing.*;

public class DesktopLauncher {
    public static void main(String[] args) {
        try {
            UIManager.setLookAndFeel(new FlatDarkLaf());
        } catch (Exception e) {
            // Fall back to default L&F
        }
        SwingUtilities.invokeLater(() -> new GameFrame().setVisible(true));
    }
}
