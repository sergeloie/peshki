package ru.anseranser.peshki.ArrRealisation;

import lombok.Getter;

import java.util.Map;

@Getter
public class ArrDraft {

    private final int[][] field = new int[4][28];
    private final Map<Integer, Integer> corners = Map.of(1, 0, 2, 7, 3, 14, 4, 21);

    public void printFieldInline() {
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 28; j++) {
                if (i == 0 || j % 7 == 0) {
                    System.out.print(field[i][j] == 0 ? "___" : field[i][j]);
                } else {
                    System.out.print("   ");
                }
            }
            System.out.println();
        }
    }

    public int maxMoveLength(int i, int j) {
        if (field[i][j] == 0) {
            return 0;
        }
        int cornerIndex = corners.get(field[i][j] / 100);



        return 0;//stub
    }


}
