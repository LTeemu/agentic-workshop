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
import javax.inject.Inject

/**
 * Settings screen ViewModel.
 *
 * ## Why is SettingsDataStore injected directly into the ViewModel?
 *
 * For simplicity — settings are such a lightweight operation
 * that a separate repository would be overkill. The ViewModel calls
 * DataStore directly (but only for read operations via Flow).
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

    /** Hash a PIN with SHA-256 and return hex string */
    fun hashPin(pin: String): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        return digest.digest(pin.toByteArray()).joinToString("") { "%02x".format(it) }
    }

    /** Enable PIN lock and store the hash */
    fun enablePinLock(pin: String) {
        viewModelScope.launch {
            val hash = hashPin(pin)
            settingsDataStore.setPinHash(hash)
            settingsDataStore.setPinRequired(true)
        }
    }

    /** Verify a PIN against the stored hash */
    suspend fun verifyPin(pin: String): Boolean {
        val hash = settingsDataStore.pinHash.first() ?: return false
        return hashPin(pin) == hash
    }

    /** Disable PIN lock and clear hash */
    fun disablePinLock() {
        viewModelScope.launch {
            settingsDataStore.clearPinHash()
            settingsDataStore.setPinRequired(false)
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
