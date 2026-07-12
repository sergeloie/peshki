package ru.anseranser.peshki.engine;

/**
 * Stable identity of a player, independent of UI. The console layer maps this
 * to an ANSI color; a mobile/desktop UI maps it to a theme color.
 */
public enum PlayerColor {
    RED, GREEN, YELLOW, BLUE;

    public static PlayerColor forIndex(int index) {
        PlayerColor[] values = values();
        return values[Math.floorMod(index, values.length)];
    }
}
