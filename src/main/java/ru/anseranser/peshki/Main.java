package ru.anseranser.peshki;

import ru.anseranser.peshki.model.Board;
import ru.anseranser.peshki.model.Player;
import ru.anseranser.peshki.util.RenderBoard;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        Board board = new Board();


        RenderBoard.drawBoard(board);

        board.getPlayers().forEach(Player::putNewPawn);

//        Player onePlayer = board.getPlayers().getFirst();

        System.out.println();

        RenderBoard.drawBoard(board);

        System.out.println();
    }

    public static void clearConsole() {
        try {
            String os = System.getProperty("os.name").toLowerCase();

            if (os.contains("win")) {
                // Windows
                new ProcessBuilder("cmd", "/c", "cls")
                        .inheritIO()
                        .start()
                        .waitFor();
            } else {
                // Unix, MacOS, Linux (поддержка ANSI escape codes)
                System.out.print("\033[H\033[2J");
                System.out.flush();
            }
        } catch (Exception e) {
            // fallback: "очистка" пустыми строками
            for (int i = 0; i < 50; i++) {
                System.out.println();
            }
        }
    }
}
