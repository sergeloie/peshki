package ru.anseranser.peshki.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import ru.anseranser.peshki.engine.GameState;

/**
 * (De)serializes a {@link GameState} to/from JSON. Used for save/load so a game
 * can be persisted and resumed in a mobile/desktop client (Phase 4).
 *
 * <p>Jackson handles Java 21 records and enums out of the box, so no custom
 * (de)serializers are required.
 */
public final class GameStateSerializer {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private GameStateSerializer() {
    }

    public static String toJson(GameState state) {
        try {
            return MAPPER.writeValueAsString(state);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize game state", e);
        }
    }

    public static GameState fromJson(String json) {
        try {
            return MAPPER.readValue(json, GameState.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize game state", e);
        }
    }
}
