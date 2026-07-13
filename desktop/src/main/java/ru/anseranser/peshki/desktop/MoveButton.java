package ru.anseranser.peshki.desktop;

import javax.swing.*;
import java.awt.*;

public class MoveButton extends JButton {
    public MoveButton(String text) {
        super(text);
        setBackground(new Color(51, 153, 76));
        setForeground(Color.WHITE);
        setFont(getFont().deriveFont(Font.BOLD, 13f));
        setMaximumSize(new Dimension(Integer.MAX_VALUE, 36));
        setFocusPainted(false);
    }
}
