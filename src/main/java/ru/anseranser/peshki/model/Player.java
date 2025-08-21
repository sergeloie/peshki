package ru.anseranser.peshki.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import ru.anseranser.peshki.MainConfig;

@Getter
@EqualsAndHashCode
public class Player {
    private final int playerNumber;
    @EqualsAndHashCode.Exclude
    private final int playerCorner;

    public Player(int playerNumber) {
        this.playerNumber = playerNumber;
        this.playerCorner = MainConfig.cornersCoordinate.get(playerNumber);
    }
}
