package ru.anseranser.peshki.enums;

import lombok.Getter;

@Getter
public enum PlayerEnum {
    PLAYER1(0),
    PLAYER2(7),
    PLAYER3(14),
    PLAYER4(21);

    private final int value;

    PlayerEnum(int value) {
        this.value = value;
    }
}
