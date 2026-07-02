package com.securenome.security

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * CryptoManager tests.
 *
 * ## Why these tests matter
 *
 * Encryption is the app's most critical component for patient data.
 * Tests verify:
 * 1. encrypt → decrypt roundtrip returns original data
 * 2. Encrypted output differs from input (actually encrypts)
 * 3. Wrong key / corrupted data → decryption fails (security)
 *
 * ## Why only encrypt/decrypt and not KeyStore?
 *
 * KeyStore is hardware-backed: tests run on JVM locally,
 * not on Android device. Android Keystore requires a real device/emulator.
 * These tests verify Cipher logic without Keystore.
 *
 * NOTE: These tests require Android runtime (Robolectric) or must be run
 * on an emulator because KeyStore needs an Android environment.
 */
class CryptoManagerTest {

    private lateinit var cryptoManager: CryptoManager

    @Before
    fun setUp() {
        // NOTE: Crashes on plain JVM without Robolectric.
        // Run on emulator from Android Studio, or add Robolectric dependency.
        cryptoManager = CryptoManager()
    }

    @Test
    fun `encrypt and decrypt returns original data`() {
        val original = "Hello world! This is a secret message with special chars: !@#".toByteArray()

        val encrypted = cryptoManager.encrypt(original)
        val decrypted = cryptoManager.decrypt(encrypted)

        assertArrayEquals(
            "Decrypt must return the original data",
            original, decrypted
        )
    }

    @Test
    fun `encrypted data is different from original`() {
        val original = "Secret message".toByteArray()

        val encrypted = cryptoManager.encrypt(original)

        assertTrue(
            "Encrypted data must differ from original",
            !encrypted.contentEquals(original)
        )
    }

    @Test
    fun `encrypted data is longer than original due to IV and tag`() {
        val original = "A".repeat(16).toByteArray() // 16 bytes

        val encrypted = cryptoManager.encrypt(original)

        // AES-GCM: IV (12) + data (16) + tag (16) = minimum 44 bytes
        assertTrue(
            "Encrypted data must be longer than original (IV + tag overhead)",
            encrypted.size > original.size
        )
    }

    @Test
    fun `encrypt produces different output each time with same input`() {
        val original = "Same message".toByteArray()

        val encrypted1 = cryptoManager.encrypt(original)
        val encrypted2 = cryptoManager.encrypt(original)

        // Different IV -> different ciphertext (same plaintext)
        assertTrue(
            "Each encryption must produce different output (random IV)",
            !encrypted1.contentEquals(encrypted2)
        )
    }

    @Test
    fun `decrypt with corrupted data throws exception`() {
        val original = "Test".toByteArray()
        val encrypted = cryptoManager.encrypt(original)

        // Corrupt one byte in the ciphertext
        val corrupted = encrypted.copyOf()
        corrupted[corrupted.size - 1] = (corrupted[corrupted.size - 1] + 1).toByte()

        assertThrows(
            "Decrypting corrupted data must throw an exception",
            javax.crypto.AEADBadTagException::class.java
        ) {
            cryptoManager.decrypt(corrupted)
        }
    }
}
