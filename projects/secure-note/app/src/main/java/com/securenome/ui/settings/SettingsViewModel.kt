package com.securenome.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.datastore.SettingsDataStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.inject.Inject

/**
 * Settings screen ViewModel.
 *
 * ## PBKDF2 for PIN hashing
 *
 * Previously used SHA-256 (fast, unsalted — trivially brute-forceable).
 * Now uses PBKDF2WithHmacSHA256 with 100k iterations and a random 16-byte salt.
 * PBKDF2 is a deliberately slow, salted key derivation function that makes
 * brute-force attacks impractical.
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsDataStore: SettingsDataStore
) : ViewModel() {

    val pinRequired: StateFlow<Boolean> =
        settingsDataStore.pinRequired
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val pinHash: StateFlow<String?> =
        settingsDataStore.pinHash
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val darkTheme: StateFlow<Boolean> =
        settingsDataStore.darkTheme
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val sharingEnabled: StateFlow<Boolean> =
        settingsDataStore.sharingEnabled
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), true)

    companion object {
        /** PBKDF2 iteration count — 100k is the OWASP 2023 recommendation. */
        private const val PBKDF2_ITERATIONS = 100_000
        /** Key length in bits. */
        private const val KEY_LENGTH = 256
        /** Salt length in bytes. */
        private const val SALT_LENGTH = 16
    }

    /** Generate a random salt for PBKDF2 (hex string). */
    fun generateSalt(): String {
        val salt = ByteArray(SALT_LENGTH)
        SecureRandom().nextBytes(salt)
        return salt.joinToString("") { "%02x".format(it) }
    }

    /**
     * Hash a PIN with PBKDF2WithHmacSHA256.
     *
     * @param pin The PIN to hash.
     * @param salt Hex-encoded salt string.
     * @return Hex-encoded PBKDF2 hash.
     */
    fun hashPin(pin: String, salt: String): String {
        val spec = PBEKeySpec(pin.toCharArray(), salt.decodeHex(), PBKDF2_ITERATIONS, KEY_LENGTH)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        return factory.generateSecret(spec).encoded.joinToString("") { "%02x".format(it) }
    }

    /** Enable PIN lock and store the hash + salt. */
    fun enablePinLock(pin: String) {
        viewModelScope.launch {
            val salt = generateSalt()
            val hash = hashPin(pin, salt)
            settingsDataStore.setPinSalt(salt)
            settingsDataStore.setPinHash(hash)
            settingsDataStore.setPinRequired(true)
            settingsDataStore.resetFailedAttempts()
        }
    }

    /** Verify a PIN against the stored hash + salt. */
    suspend fun verifyPin(pin: String): Boolean {
        val hash = settingsDataStore.pinHash.first() ?: return false
        val salt = settingsDataStore.pinSalt.first() ?: return false
        return hashPin(pin, salt) == hash
    }

    /** Disable PIN lock and clear hash/salt. */
    fun disablePinLock() {
        viewModelScope.launch {
            settingsDataStore.clearPinHash()
            settingsDataStore.setPinRequired(false)
            settingsDataStore.resetFailedAttempts()
        }
    }

    fun toggleDarkTheme(enabled: Boolean) {
        viewModelScope.launch {
            settingsDataStore.setDarkTheme(enabled)
        }
    }

    fun toggleSharing(enabled: Boolean) {
        viewModelScope.launch {
            settingsDataStore.setSharingEnabled(enabled)
        }
    }
}

/** Decode a hex string to ByteArray. */
private fun String.decodeHex(): ByteArray {
    val hex = this
    require(hex.length % 2 == 0) { "Hex string must have even length" }
    return ByteArray(hex.length / 2) {
        (((hex[it * 2].digitToIntOrNull(16) ?: 0) shl 4) or
            (hex[it * 2 + 1].digitToIntOrNull(16) ?: 0)).toByte()
    }
}
