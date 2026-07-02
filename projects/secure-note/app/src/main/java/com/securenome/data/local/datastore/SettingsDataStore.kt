package com.securenome.data.local.datastore

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
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
        val BIOMETRIC_REQUIRED = booleanPreferencesKey("biometric_required")
        val DEFAULT_NOTEBOOK_NAME = stringPreferencesKey("default_notebook_name")
        val DARK_THEME = booleanPreferencesKey("dark_theme")
        val SHARE_SERVER_ENABLED = booleanPreferencesKey("share_server_enabled")
        val SHARE_SERVER_URL = stringPreferencesKey("share_server_url")
    }

    /** Is biometric authentication enabled. Default: false. */
    val biometricRequired: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[BIOMETRIC_REQUIRED] ?: false
    }

    /** Is dark mode enabled. Default: false = follows system. */
    val darkTheme: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[DARK_THEME] ?: false
    }

    /** Share via server relay. Default: true. */
    val shareServerEnabled: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[SHARE_SERVER_ENABLED] ?: true
    }

    /** Custom share server URL. Default: localhost for development. */
    val shareServerUrl: Flow<String> = dataStore.data.map { prefs ->
        prefs[SHARE_SERVER_URL] ?: "http://10.0.2.2:3001" // Android emulator -> host localhost
    }

    /** Default notebook name. */
    val defaultNotebookName: Flow<String> = dataStore.data.map { prefs ->
        prefs[DEFAULT_NOTEBOOK_NAME] ?: "My notebook"
    }

    /** Enable/disable biometric authentication */
    suspend fun setBiometricRequired(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[BIOMETRIC_REQUIRED] = enabled
        }
    }

    /** Set dark mode */
    suspend fun setDarkTheme(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[DARK_THEME] = enabled
        }
    }

    /** Enable/disable server relay sharing */
    suspend fun setShareServerEnabled(enabled: Boolean) {
        dataStore.edit { prefs ->
            prefs[SHARE_SERVER_ENABLED] = enabled
        }
    }

    /** Set custom share server URL */
    suspend fun setShareServerUrl(url: String) {
        dataStore.edit { prefs ->
            prefs[SHARE_SERVER_URL] = url
        }
    }

    /** Set default notebook name */
    suspend fun setDefaultNotebookName(name: String) {
        dataStore.edit { prefs ->
            prefs[DEFAULT_NOTEBOOK_NAME] = name
        }
    }
}
