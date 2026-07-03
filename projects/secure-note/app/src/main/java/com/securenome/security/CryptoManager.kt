package com.securenome.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages AES-256-GCM encryption via Android Keystore.
 *
 * ## Why does this class exist?
 *
 * An app handling medical data must encrypt all stored data.
 * AES-256-GCM is a NIST-recommended symmetric encryption algorithm that provides
 * both confidentiality and integrity checking (authenticated encryption).
 *
 * ## Why Android Keystore?
 *
 * Android Keystore stores encryption keys in the device's secure hardware (TEE),
 * so even the app itself cannot leak the key — the OS only exposes
 * the key through Cipher operations. This prevents extracting the key
 * from the app's files.
 *
 * ## AES-GCM vs AES-CBC
 *
 * - **GCM** includes authentication (tag), so data integrity is verified.
 * - **GCM** does not need padding, unlike CBC.
 * - **GCM** requires a unique IV (12 bytes) for each encryption.
 *
 * @see Cipher AES/GCM/NoPadding
 * @see KeyGenParameterSpec
 */
@Singleton
class CryptoManager @Inject constructor() {

    companion object {
        private const val KEYSTORE_ALIAS = "secure_note_key"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val IV_LENGTH = 12    // GCM recommends 12-byte IV
        private const val TAG_LENGTH = 128  // 128-bit authentication tag
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    /**
     * Gets or creates an AES encryption key in Android Keystore.
     *
     * ## Why `KeyGenParameterSpec`?
     *
     * Modern way to generate keys directly in Keystore. Ensures the key
     * is hardware-backed (TEE) and never leaves the Keystore.
     */
    private fun getOrCreateKey(): SecretKey {
        keyStore.load(null)

        // If key already exists, return it
        keyStore.getEntry(KEYSTORE_ALIAS, null)?.let { entry ->
            return (entry as KeyStore.SecretKeyEntry).secretKey
        }

        // Otherwise create a new AES-256 key
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEYSTORE
        )

        val spec = KeyGenParameterSpec.Builder(
            KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    /**
     * Encrypts [data] with AES-256-GCM.
     *
     * @return Encrypted data in the form: [IV (12 bytes)][encrypted data (N bytes)][tag (16 bytes)]
     *
     * ## Why is IV stored with the data?
     *
     * IV (initialization vector) is random and unique per encryption.
     * It must be stored with the encrypted data so decryption is possible.
     * The IV is not secret — it is public information.
     */
    fun encrypt(data: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val iv = cipher.iv  // 12 bytes
        val encrypted = cipher.doFinal(data) // contains data + tag (GCM)
        return iv + encrypted
    }

    /**
     * Decrypts [encryptedData] with AES-256-GCM.
     *
     * @param encryptedData Form: [IV (12 bytes)][encrypted data + tag]
     * @throws javax.crypto.AEADBadTagException If the data is corrupted or wrong key
     */
    fun decrypt(encryptedData: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)

        // First 12 bytes are the IV
        val iv = encryptedData.copyOfRange(0, IV_LENGTH)
        val ciphertext = encryptedData.copyOfRange(IV_LENGTH, encryptedData.size)

        val spec = GCMParameterSpec(TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), spec)
        return cipher.doFinal(ciphertext)
    }
}
