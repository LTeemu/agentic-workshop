package com.securenome.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.datastore.SettingsDataStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
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

    val biometricRequired: StateFlow<Boolean> =
        settingsDataStore.biometricRequired
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val darkTheme: StateFlow<Boolean> =
        settingsDataStore.darkTheme
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val shareServerEnabled: StateFlow<Boolean> =
        settingsDataStore.shareServerEnabled
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), true)

    fun toggleBiometric(enabled: Boolean) {
        viewModelScope.launch {
            settingsDataStore.setBiometricRequired(enabled)
        }
    }

    fun toggleDarkTheme(enabled: Boolean) {
        viewModelScope.launch {
            settingsDataStore.setDarkTheme(enabled)
        }
    }

    fun toggleShareServer(enabled: Boolean) {
        viewModelScope.launch {
            settingsDataStore.setShareServerEnabled(enabled)
        }
    }
}
