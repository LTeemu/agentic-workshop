package com.securenome.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.securenome.security.CryptoManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/**
 * User settings in DataStore.
 *
 * ## Why DataStore instead of SharedPreferences?
 *
 * DataStore is the replacement for SharedPreferences. It is:
 * 1. **Async** — does not block the UI thread
 * 2. **Type-safe** — Preferences keys are strongly typed
 * 3. **Flow-based** — changes propagate to UI automatically
 * 4. **Consistent** — provides transaction-like updates
 *
 * ## Why encrypt some values?
 *
 * The PIN hash, salt, and pending revocations contain sensitive data.
 * They are encrypted with AES-256-GCM (CryptoManager) before storage.
 * Settings like dark theme and sharing toggle have no sensitive content
 * and remain in plaintext for performance.
 */
@Singleton
class SettingsDataStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val cryptoManager: CryptoManager
) {
    companion object {
        val PIN_REQUIRED = booleanPreferencesKey("pin_required")
        val PIN_HASH = stringPreferencesKey("pin_hash")
        val PIN_SALT = stringPreferencesKey("pin_salt")
        val PIN_FAILED_ATTEMPTS = intPreferencesKey("pin_failed_attempts")
        val PIN_LOCKED_UNTIL = longPreferencesKey("pin_locked_until")
        val DEFAULT_NOTEBOOK_NAME = stringPreferencesKey("default_notebook_name")
        val DARK_THEME = booleanPreferencesKey("dark_theme")
        val SHARING_ENABLED = booleanPreferencesKey("sharing_enabled")
        val PENDING_REVOCATIONS = stringPreferencesKey("pending_revocations")
    }

    /** JSON serializer for the pending revocations list. */
    private val json = Json { ignoreUnknownKeys = true }

    /** A single pending revocation: a share code that couldn't be deleted from the server. */
    @Serializable
    data class PendingRevocation(
        val noteId: Long,
        val shareCode: String
    )

    // --- Encrypted value helpers ---

    /** Encrypt [plain] with CryptoManager and base64-encode for text storage. */
    private fun encryptString(plain: String): String =
        Base64.getEncoder().encodeToString(cryptoManager.encrypt(plain.toByteArray()))

    /** Base64-decode and decrypt with CryptoManager. Returns null on failure. */
    private fun decryptString(encrypted: String): String? = try {
        String(cryptoManager.decrypt(Base64.getDecoder().decode(encrypted)))
    } catch (_: Exception) { null }

    // --- PIN settings (encrypted) ---

    /** Is PIN lock enabled. Default: false. */
    val pinRequired: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[PIN_REQUIRED] ?: false
    }

    /** PBKDF2 hash of the PIN (hex string). Null if not set. */
    val pinHash: Flow<String?> = dataStore.data.map { prefs ->
        prefs[PIN_HASH]?.let { decryptString(it) }
    }

    /** Random salt used with PBKDF2 (hex string). Null if not set. */
    val pinSalt: Flow<String?> = dataStore.data.map { prefs ->
        prefs[PIN_SALT]?.let { decryptString(it) }
    }

    /** Number of consecutive failed PIN attempts (not encrypted — no sensitive data). */
    val pinFailedAttempts: Flow<Int> = dataStore.data.map { prefs ->
        prefs[PIN_FAILED_ATTEMPTS] ?: 0
    }

    /** Timestamp (millis) until which the PIN is locked (0 = not locked). */
    val pinLockedUntil: Flow<Long> = dataStore.data.map { prefs ->
        prefs[PIN_LOCKED_UNTIL] ?: 0L
    }

    /** Enable/disable PIN lock. */
    suspend fun setPinRequired(enabled: Boolean) {
        dataStore.edit { prefs -> prefs[PIN_REQUIRED] = enabled }
    }

    /** Store the PBKDF2 hash of the PIN (encrypted). */
    suspend fun setPinHash(hash: String) {
        dataStore.edit { prefs -> prefs[PIN_HASH] = encryptString(hash) }
    }

    /** Store the PBKDF2 salt (encrypted). */
    suspend fun setPinSalt(salt: String) {
        dataStore.edit { prefs -> prefs[PIN_SALT] = encryptString(salt) }
    }

    /** Clear the stored PIN hash and salt. */
    suspend fun clearPinHash() {
        dataStore.edit { prefs ->
            prefs.remove(PIN_HASH)
            prefs.remove(PIN_SALT)
        }
    }

    /** Increment the failed PIN attempt counter. */
    suspend fun incrementFailedAttempts() {
        dataStore.edit { prefs ->
            prefs[PIN_FAILED_ATTEMPTS] = (prefs[PIN_FAILED_ATTEMPTS] ?: 0) + 1
        }
    }

    /** Reset failed attempts and lockout after successful PIN entry. */
    suspend fun resetFailedAttempts() {
        dataStore.edit { prefs ->
            prefs.remove(PIN_FAILED_ATTEMPTS)
            prefs.remove(PIN_LOCKED_UNTIL)
        }
    }

    /** Set the timestamp until which the PIN is locked. */
    suspend fun setLockedUntil(timestamp: Long) {
        dataStore.edit { prefs -> prefs[PIN_LOCKED_UNTIL] = timestamp }
    }

    // --- Non-sensitive settings (plaintext) ---

    /** Is dark mode enabled. Default: false = follows system. */
    val darkTheme: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[DARK_THEME] ?: false
    }

    /** Master sharing toggle. Default: true. When off, all sharing is blocked. */
    val sharingEnabled: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[SHARING_ENABLED] ?: true
    }

    /** Default notebook name. */
    val defaultNotebookName: Flow<String> = dataStore.data.map { prefs ->
        prefs[DEFAULT_NOTEBOOK_NAME] ?: "My notebook"
    }

    /** Set dark mode. */
    suspend fun setDarkTheme(enabled: Boolean) {
        dataStore.edit { prefs -> prefs[DARK_THEME] = enabled }
    }

    /** Enable/disable the master sharing toggle. */
    suspend fun setSharingEnabled(enabled: Boolean) {
        dataStore.edit { prefs -> prefs[SHARING_ENABLED] = enabled }
    }

    /** Set default notebook name. */
    suspend fun setDefaultNotebookName(name: String) {
        dataStore.edit { prefs -> prefs[DEFAULT_NOTEBOOK_NAME] = name }
    }

    // --- Pending revocations (encrypted) ---

    /**
     * Get all pending revocations (share codes that couldn't be deleted from the server).
     * Stored encrypted to protect share codes at rest.
     */
    suspend fun getPendingRevocations(): List<PendingRevocation> {
        val raw = dataStore.data.first()[PENDING_REVOCATIONS] ?: return emptyList()
        val decrypted = decryptString(raw) ?: return emptyList()
        return try {
            json.decodeFromString<List<PendingRevocation>>(decrypted)
        } catch (_: Exception) {
            emptyList()
        }
    }

    /** Add a pending revocation (encrypted). */
    suspend fun addPendingRevocation(noteId: Long, shareCode: String) {
        val current = getPendingRevocations().toMutableList()
        if (current.any { it.noteId == noteId }) return
        current.add(PendingRevocation(noteId, shareCode))
        dataStore.edit { prefs ->
            prefs[PENDING_REVOCATIONS] = encryptString(json.encodeToString(current))
        }
    }

    /** Remove a pending revocation (successfully retried). */
    suspend fun removePendingRevocation(noteId: Long) {
        val current = getPendingRevocations().toMutableList()
        current.removeAll { it.noteId == noteId }
        dataStore.edit { prefs ->
            prefs[PENDING_REVOCATIONS] = encryptString(json.encodeToString(current))
        }
    }

    // --- Full wipe ---

    /**
     * Clear all preferences. Used by the "Forgot PIN" recovery flow.
     *
     * This goes through DataStore's proper transactional channel rather
     * than deleting the underlying file, so any active Flow subscribers
     * (e.g. [collectAsState] in the lock screen) receive a clean empty
     * state instead of crashing on a missing file.
     */
    suspend fun clearAll() {
        dataStore.edit { it.clear() }
    }
}
