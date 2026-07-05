package com.securenome.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
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
 * ## Why a SettingsDataStore class instead of direct DataStore usage?
 *
 * A single maintainable place for all setting keys. ViewModels
 * don't know about DataStore's internal structure.
 */
@Singleton
class SettingsDataStore @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    companion object {
        val PIN_REQUIRED = booleanPreferencesKey("pin_required")
        val PIN_HASH = stringPreferencesKey("pin_hash")
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

    /** Is PIN lock enabled. Default: false. */
    val pinRequired: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[PIN_REQUIRED] ?: false
    }

    /** SHA-256 hash of the PIN (hex string). Null if not set. */
    val pinHash: Flow<String?> = dataStore.data.map { prefs ->
        prefs[PIN_HASH]
    }

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

    /** Enable/disable PIN lock */
    suspend fun setPinRequired(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[PIN_REQUIRED] = enabled
        }
    }

    /** Store the SHA-256 hash of the PIN */
    suspend fun setPinHash(hash: String) {
        dataStore.edit { prefs ->
            prefs[PIN_HASH] = hash
        }
    }

    /** Clear the stored PIN hash */
    suspend fun clearPinHash() {
        dataStore.edit { prefs ->
            prefs.remove(PIN_HASH)
        }
    }

    /** Set dark mode */
    suspend fun setDarkTheme(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[DARK_THEME] = enabled
        }
    }

    /** Enable/disable the master sharing toggle */
    suspend fun setSharingEnabled(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[SHARING_ENABLED] = enabled
        }
    }

    /** Set default notebook name */
    suspend fun setDefaultNotebookName(name: String) {
        dataStore.edit { prefs ->
            prefs[DEFAULT_NOTEBOOK_NAME] = name
        }
    }

    // --- Pending revocations ---

    /**
     * Get all pending revocations (share codes that couldn't be deleted from the server).
     */
    suspend fun getPendingRevocations(): List<PendingRevocation> {
        val raw = dataStore.data.first()[PENDING_REVOCATIONS] ?: return emptyList()
        return try {
            json.decodeFromString<List<PendingRevocation>>(raw)
        } catch (_: Exception) {
            emptyList()
        }
    }

    /** Add a pending revocation. */
    suspend fun addPendingRevocation(noteId: Long, shareCode: String) {
        val current = getPendingRevocations().toMutableList()
        // Avoid duplicates for the same note
        if (current.any { it.noteId == noteId }) return
        current.add(PendingRevocation(noteId, shareCode))
        dataStore.edit { prefs ->
            prefs[PENDING_REVOCATIONS] = json.encodeToString(current)
        }
    }

    /** Remove a pending revocation (successfully retried). */
    suspend fun removePendingRevocation(noteId: Long) {
        val current = getPendingRevocations().toMutableList()
        current.removeAll { it.noteId == noteId }
        dataStore.edit { prefs ->
            prefs[PENDING_REVOCATIONS] = json.encodeToString(current)
        }
    }
}
