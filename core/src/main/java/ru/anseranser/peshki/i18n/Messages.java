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
    private static final ResourceBundle.Control NO_FALLBACK =
            ResourceBundle.Control.getNoFallbackControl(ResourceBundle.Control.FORMAT_PROPERTIES);
    private static volatile ResourceBundle bundle = load(Locale.getDefault());

    private Messages() {
    }

    public static void setLocale(Locale locale) {
        bundle = load(locale);
    }

    /**
     * Loads the bundle for the given locale without falling back to the JVM
     * default locale. English is the root bundle ({@code messages.properties}),
     * so a request for "en" maps to {@link Locale#ROOT}; otherwise the default
     * locale (e.g. ru) would be inserted into the fallback chain and win over
     * the English root. Unknown languages fall back to the root bundle.
     */
    private static ResourceBundle load(Locale locale) {
        Locale target = "en".equals(locale.getLanguage()) ? Locale.ROOT : locale;
        try {
            return ResourceBundle.getBundle(BASE_NAME, target, NO_FALLBACK);
        } catch (MissingResourceException e) {
            return ResourceBundle.getBundle(BASE_NAME, Locale.ROOT, NO_FALLBACK);
        }
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
