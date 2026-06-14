package ru.anseranser.peshki;

import ru.anseranser.peshki.input.ConsoleMoveInput;

public class Main {
    public static void main(String[] args) {
        Game game = new Game(new ConsoleMoveInput());
        game.start();
    }
}
