package ru.anseranser.peshki.i18n;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

/**
 * Tiny i18n helper backed by {@code messages*.properties} resource bundles.
 * Centralises all user-facing strings so the console (and any future
 * mobile/desktop UI) can be localised without touching view code.
 */
public final class Messages {

    private static final String BASE_NAME = "messages";
    private static volatile ResourceBundle bundle =
            ResourceBundle.getBundle(BASE_NAME, Locale.getDefault());

    private Messages() {
    }

    public static void setLocale(Locale locale) {
        bundle = ResourceBundle.getBundle(BASE_NAME, locale);
    }

    public static String get(String key, Object... args) {
        try {
            String pattern = bundle.getString(key);
            return args.length == 0 ? pattern : MessageFormat.format(pattern, args);
        } catch (MissingResourceException e) {
            return key;
        }
    }
}
