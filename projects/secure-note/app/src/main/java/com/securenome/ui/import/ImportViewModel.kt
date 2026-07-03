package com.securenome.ui.import

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.datastore.SettingsDataStore
import com.securenome.data.local.entity.NoteType
import com.securenome.data.repository.NoteRepository
import com.securenome.data.repository.NotebookRepository
import com.securenome.data.share.ShareManager
import com.securenome.security.CryptoManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ImportUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    val isServerReachable: Boolean = false
)

/**
 * Format of shared note data:
 *   type=TEXT\n
 *   <plain text content>
 *
 * For CHECKLIST notes, content is empty (items stored separately and not shared).
 * For PHOTO notes, content is empty (photos stored separately and not shared).
 */
@HiltViewModel
class ImportViewModel @Inject constructor(
    private val shareManager: ShareManager,
    private val noteRepository: NoteRepository,
    private val notebookRepository: NotebookRepository,
    private val settingsDataStore: SettingsDataStore,
    private val cryptoManager: CryptoManager
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
            // Master toggle check
            if (!settingsDataStore.sharingEnabled.first()) {
                _state.value = ImportUiState(
                    isLoading = false,
                    error = "Sharing is disabled in Settings"
                )
                return@launch
            }

            _state.value = ImportUiState(isLoading = true)

            try {
                val encryptedData = shareManager.importShare(code)
                if (encryptedData == null) {
                    _state.value = ImportUiState(
                        isLoading = false,
                        error = "No note found for code $code"
                    )
                    return@launch
                }

                // Parse the decrypted data
                val raw = String(encryptedData)
                val lines = raw.lines()
                val typeLine = lines.firstOrNull { it.startsWith("type=") }
                val noteType = typeLine?.removePrefix("type=")?.let {
                    try { NoteType.valueOf(it) } catch (_: Exception) { NoteType.TEXT }
                } ?: NoteType.TEXT
                val content = lines.filter { line ->
                        !line.startsWith("type=") &&
                        !line.startsWith("item=") &&
                        !line.startsWith("photo=")
                    }
                    .joinToString("\n")
                    .trim()

                // Determine target notebook — use first existing one or create "Imported"
                val notebooks = notebookRepository.allNotebooks.first()
                val notebookId = if (notebooks.isNotEmpty()) {
                    notebooks.first().id
                } else {
                    notebookRepository.createNotebook("Imported")
                }

                // Extract checklist items if present
                val itemTexts = mutableListOf<String>()
                val itemDone = mutableListOf<Boolean>()
                for (line in lines.filter { it.startsWith("item=") }) {
                    val parts = line.removePrefix("item=").split("||")
                    itemTexts.add(parts[0])
                    itemDone.add(parts.getOrNull(1)?.toBooleanStrictOrNull() ?: false)
                }

                // Extract photo data
                data class PhotoShare(
                    val encryptedBytes: ByteArray,
                    val encryptedThumb: ByteArray?,
                    val createdAt: Long
                )
                val photoShares = lines.filter { it.startsWith("photo=") }.mapNotNull { line ->
                    val parts = line.removePrefix("photo=").split("||")
                    val b64Bytes = parts.getOrNull(0) ?: return@mapNotNull null
                    val b64Thumb = parts.getOrNull(1)?.takeIf { it.isNotEmpty() }
                    val createdAt = parts.getOrNull(2)?.toLongOrNull() ?: System.currentTimeMillis()
                    PhotoShare(
                        encryptedBytes = java.util.Base64.getDecoder().decode(b64Bytes),
                        encryptedThumb = b64Thumb?.let { java.util.Base64.getDecoder().decode(it) },
                        createdAt = createdAt
                    )
                }

                val newNoteId: Long = when (noteType) {
                    NoteType.CHECKLIST -> {
                        val noteId = noteRepository.createChecklistNote(notebookId, itemTexts)
                        for (i in itemDone.indices) {
                            if (itemDone[i]) {
                                val entities = noteRepository.getChecklistItemEntities(noteId)
                                if (i < entities.size) {
                                    noteRepository.toggleChecklistItem(entities[i])
                                }
                            }
                        }
                        noteId
                    }
                    NoteType.TEXT -> noteRepository.createTextNote(notebookId, content)
                    NoteType.PHOTO -> noteRepository.createTextNote(notebookId, content)
                }

                // Save imported photos
                for (photoShare in photoShares) {
                    val imageBytes = cryptoManager.decrypt(photoShare.encryptedBytes)
                    val thumbBytes = photoShare.encryptedThumb?.let {
                        cryptoManager.decrypt(it)
                    } ?: noteRepository.createThumbnail(imageBytes)
                    noteRepository.addPhoto(newNoteId, imageBytes, thumbBytes)
                }

                _state.value = ImportUiState(isSuccess = true)
                onSuccess()
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
