package ru.anseranser.peshki;

import ru.anseranser.peshki.enums.PlayerEnum;

import java.util.Map;

public class Config {

    public static final Map<PlayerEnum, Integer> Corners = Map.of(
            PlayerEnum.PLAYER1, 1,
            PlayerEnum.PLAYER2, 8,
            PlayerEnum.PLAYER3, 15,
            PlayerEnum.PLAYER4, 22);

    public static final Integer fieldLength = 28;


}
