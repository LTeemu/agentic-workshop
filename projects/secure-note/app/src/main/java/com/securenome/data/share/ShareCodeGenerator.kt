package com.securenome.data.share

import java.security.SecureRandom

/**
 * Generates human-friendly note share codes.
 *
 * ## Format
 *
 * Codes use the canonical `XXXX-XXXX` layout shown in the import UI
 * (8 chars with a hyphen after the 4th), e.g. "A3F9-K2B1".
 *
 * ## Why this alphabet?
 *
 * It omits confusable characters (I, O, 0, 1) so codes can be typed by
 * hand and read aloud reliably. Every symbol matches `[A-Z0-9]`, so every
 * generated code satisfies the `[A-Z0-9]{4}-[A-Z0-9]{4}` format contract.
 */
object ShareCodeGenerator {
    /** Ambiguity-free alphabet: 24 letters + 8 digits = 2^5 symbols/char. */
    private const val ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    private const val HALF_GROUP = 4

    private val random = SecureRandom()

    /** A fresh share code like "A3F9-K2B1". */
    fun generate(): String {
        val code = (0 until HALF_GROUP * 2).map { ALPHABET[random.nextInt(ALPHABET.length)] }
        return code.take(HALF_GROUP).joinToString("") +
            "-" +
            code.drop(HALF_GROUP).joinToString("")
    }
}