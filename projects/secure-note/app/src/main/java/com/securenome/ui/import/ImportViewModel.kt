package com.securenome.ui.import

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.share.ShareManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ImportUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    val isServerReachable: Boolean = false
)

@HiltViewModel
class ImportViewModel @Inject constructor(
    private val shareManager: ShareManager
) : ViewModel() {

    private val _state = MutableStateFlow(ImportUiState())
    val state: StateFlow<ImportUiState> = _state.asStateFlow()

    fun checkServer() {
        viewModelScope.launch {
            val reachable = shareManager.isServerReachable()
            _state.value = _state.value.copy(isServerReachable = reachable)
        }
    }

    fun importShare(code: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.value = ImportUiState(isLoading = true)

            try {
                val data = shareManager.importShare(code)
                if (data != null) {
                    _state.value = ImportUiState(isSuccess = true)
                    onSuccess()
                } else {
                    _state.value = ImportUiState(
                        isLoading = false,
                        error = "No note found for code $code"
                    )
                }
            } catch (e: Exception) {
                _state.value = ImportUiState(
                    isLoading = false,
                    error = "Error: ${e.message}"
                )
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
