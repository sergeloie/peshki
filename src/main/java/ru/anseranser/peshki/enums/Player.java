package ru.anseranser.peshki.enums;

import lombok.Getter;

@Getter
public enum Player {
    PLAYER1(0),
    PLAYER2(7),
    PLAYER3(14),
    PLAYER4(21);

    private final int value;

    Player(int value) {
        this.value = value;
    }
}
