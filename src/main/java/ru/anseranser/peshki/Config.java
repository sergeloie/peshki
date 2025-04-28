package ru.anseranser.peshki;

import ru.anseranser.peshki.enums.Player;

import java.util.Map;

public class Config {

    public static final Map<Player, Integer> Corners = Map.of(
            Player.PLAYER1, 1,
            Player.PLAYER2, 8,
            Player.PLAYER3, 15,
            Player.PLAYER4, 22);

    public static final Integer fieldLength = 28;


}
