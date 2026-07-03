package com.securenome.ui.editor

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.entity.NoteType
import com.securenome.data.repository.NoteRepository
import com.securenome.security.CryptoManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Note editor ViewModel.
 *
 * ## Why MutableStateFlow instead of StateFlow directly?
 *
 * We need writable state (text field value, checklist items, photos),
 * but want to expose only a read-only StateFlow externally.
 */
data class EditorState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val title: String = "",
    val content: String = "",
    val noteType: NoteType = NoteType.TEXT,
    val checklistItems: List<ChecklistItemUi> = emptyList(),
    val photos: List<PhotoUi> = emptyList(),
    val error: String? = null
)

data class ChecklistItemUi(
    val id: Long = 0,
    val text: String = "",
    val isDone: Boolean = false
)

data class PhotoUi(
    val id: Long,
    val thumbnailBytes: ByteArray,
    val createdAt: Long
)

@HiltViewModel
class NoteEditorViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val noteRepository: NoteRepository,
    private val cryptoManager: CryptoManager
) : ViewModel() {

    private val _state = MutableStateFlow(EditorState())
    val state: StateFlow<EditorState> = _state.asStateFlow()

    private var noteId: Long? = null
    private var notebookId: Long = 0
    private var noteType: NoteType = NoteType.TEXT
    private var autoSaveJob: Job? = null

    fun initialize(notebookId: Long, noteId: Long?, noteType: NoteType? = null) {
        this.notebookId = notebookId
        this.noteId = noteId
        if (noteType != null) {
            this.noteType = noteType
            _state.value = _state.value.copy(noteType = noteType)
        }

        if (noteId != null) {
            loadNote(noteId)
        }
    }

    // --- Auto-save for text content ---

    /**
     * Called on every keystroke. Updates content in state and triggers
     * a debounced auto-save (1.5s after the last change).
     */
    fun onTextChanged(content: String) {
        _state.value = _state.value.copy(content = content)
        autoSaveJob?.cancel()
        autoSaveJob = viewModelScope.launch {
            delay(1500)
            performSave()
        }
    }

    /**
     * Save immediately (called on back navigation after canceling any pending auto-save).
     */
    fun saveOnBack() {
        autoSaveJob?.cancel()
        viewModelScope.launch { performSave() }
    }

    private suspend fun performSave() {
        val content = _state.value.content
        _state.value = _state.value.copy(isSaving = true)
        try {
            if (noteId != null) {
                when (noteType) {
                    NoteType.TEXT -> noteRepository.updateTextNote(noteId!!, content)
                    NoteType.CHECKLIST -> saveChecklistItems()
                    NoteType.PHOTO -> noteRepository.updateTextNote(noteId!!, content)
                }
            } else {
                noteId = when (noteType) {
                    NoteType.TEXT -> noteRepository.createTextNote(notebookId, content)
                    NoteType.CHECKLIST -> noteRepository.createChecklistNote(
                        notebookId,
                        _state.value.checklistItems.map { it.text }
                    )
                    NoteType.PHOTO -> noteRepository.createPhotoNote(notebookId)
                }
            }
            _state.value = _state.value.copy(isSaving = false)
        } catch (e: Exception) {
            _state.value = _state.value.copy(
                isSaving = false,
                error = "Error saving: ${e.message}"
            )
        }
    }

    /**
     * Save checklist state: delete removed items, insert new ones.
     * Already-saved items have their toggle state persisted immediately,
     * so only newly added items (negative IDs) need insertion here.
     */
    private suspend fun saveChecklistItems() {
        val currentIds = _state.value.checklistItems.map { it.id }.toSet()
        val newItems = _state.value.checklistItems.filter { it.id < 0 }

        // Delete items removed from the list
        val dbItems = noteRepository.getChecklistItemEntities(noteId!!)
        for (dbItem in dbItems) {
            if (dbItem.id !in currentIds) {
                noteRepository.deleteChecklistItem(dbItem)
            }
        }

        // Insert new items
        for (item in newItems) {
            noteRepository.addChecklistItem(noteId!!, item.text, item.isDone)
        }
    }

    private fun loadNote(noteId: Long) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                noteRepository.getNoteById(noteId).collect { noteWithDetails ->
                    if (noteWithDetails != null) {
                        noteType = noteWithDetails.note.type
                        val decrypted = cryptoManager.decrypt(
                            noteWithDetails.note.encryptedContent
                        )
                        _state.value = _state.value.copy(
                            isLoading = false,
                            title = "Note",
                            content = String(decrypted),
                            noteType = noteWithDetails.note.type,
                            checklistItems = noteWithDetails.checklistItems.map {
                                ChecklistItemUi(
                                    id = it.id,
                                    text = String(cryptoManager.decrypt(it.encryptedText)),
                                    isDone = it.isDone
                                )
                            },
                            photos = noteWithDetails.photos.mapNotNull { photo ->
                                val thumb = photo.thumbnailBytes?.let {
                                    try { cryptoManager.decrypt(it) } catch (_: Exception) { null }
                                } ?: return@mapNotNull null
                                PhotoUi(
                                    id = photo.id,
                                    thumbnailBytes = thumb,
                                    createdAt = photo.createdAt
                                )
                            }
                        )
                    }
                    return@collect
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = "Error loading note: ${e.message}"
                )
            }
        }
    }

    /**
     * Save a captured/selected photo to the current note.
     * If the note doesn't exist yet, creates it first as a TEXT note
     * (all note types can contain photos — no separate PHOTO type needed).
     */
    fun savePhoto(imageUri: Uri) {
        viewModelScope.launch {
            try {
                // Read bytes from URI
                val imageBytes = context.contentResolver.openInputStream(imageUri)
                    ?.use { it.readBytes() }
                    ?: throw Exception("Could not read image")

                // Create the note first if needed (as TEXT — photos can be added to any type)
                if (noteId == null) {
                    noteId = noteRepository.createTextNote(notebookId, "")
                }

                // Compute thumbnail once and pass to addPhoto to avoid double processing
                val thumbnailBytes = noteRepository.createThumbnail(imageBytes)
                val photoId = noteRepository.addPhoto(noteId!!, imageBytes, thumbnailBytes)

                _state.value = _state.value.copy(
                    photos = _state.value.photos + PhotoUi(
                        id = photoId,
                        thumbnailBytes = thumbnailBytes,
                        createdAt = System.currentTimeMillis()
                    )
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    error = "Error saving photo: ${e.message}"
                )
            }
        }
    }

    /** Delete a photo from the current note. */
    fun deletePhoto(photoId: Long) {
        viewModelScope.launch {
            try {
                val photo = noteRepository.getPhotoEntityById(photoId) ?: return@launch
                noteRepository.deletePhoto(photo)
                _state.value = _state.value.copy(
                    photos = _state.value.photos.filter { it.id != photoId }
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    error = "Error deleting photo: ${e.message}"
                )
            }
        }
    }

    // --- Checklist item management ---

    fun addChecklistItem(text: String) {
        if (text.isBlank()) return
        val newItem = ChecklistItemUi(
            id = -System.currentTimeMillis(), // temporary negative id for new items
            text = text,
            isDone = false
        )
        _state.value = _state.value.copy(
            checklistItems = _state.value.checklistItems + newItem
        )
    }

    fun toggleChecklistItem(itemId: Long) {
        // Update local state immediately for responsiveness
        _state.value = _state.value.copy(
            checklistItems = _state.value.checklistItems.map {
                if (it.id == itemId) it.copy(isDone = !it.isDone) else it
            }
        )
        // Persist immediately if item is already saved (positive ID)
        if (itemId > 0) {
            viewModelScope.launch {
                val entity = noteRepository.getChecklistItemEntityById(itemId)
                if (entity != null) {
                    noteRepository.toggleChecklistItem(entity)
                }
            }
        }
    }

    fun deleteChecklistItem(itemId: Long) {
        _state.value = _state.value.copy(
            checklistItems = _state.value.checklistItems.filter { it.id != itemId }
        )
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
