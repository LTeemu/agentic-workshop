package com.securenome.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.entity.NoteType
import com.securenome.data.repository.NoteRepository
import com.securenome.security.CryptoManager
import dagger.hilt.android.lifecycle.HiltViewModel
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
 * We need writable state (text field value, checklist items),
 * but want to expose only a read-only StateFlow externally.
 */
data class EditorState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val title: String = "",
    val content: String = "",
    val noteType: NoteType = NoteType.TEXT,
    val checklistItems: List<ChecklistItemUi> = emptyList(),
    val error: String? = null
)

data class ChecklistItemUi(
    val id: Long = 0,
    val text: String = "",
    val isDone: Boolean = false
)

@HiltViewModel
class NoteEditorViewModel @Inject constructor(
    private val noteRepository: NoteRepository,
    private val cryptoManager: CryptoManager
) : ViewModel() {

    private val _state = MutableStateFlow(EditorState())
    val state: StateFlow<EditorState> = _state.asStateFlow()

    private var noteId: Long? = null
    private var notebookId: Long = 0
    private var noteType: NoteType = NoteType.TEXT

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

    private fun loadNote(noteId: Long) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            try {
                noteRepository.getNoteById(noteId).collect { noteWithDetails ->
                    if (noteWithDetails != null) {
                        // Use the actual note type from the loaded entity
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

    fun saveTextNote(content: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSaving = true)
            try {
                if (noteId != null) {
                    when (noteType) {
                        NoteType.TEXT -> noteRepository.updateTextNote(noteId!!, content)
                        NoteType.CHECKLIST -> {
                            noteRepository.deleteAllChecklistItems(noteId!!)
                            for (item in _state.value.checklistItems) {
                                noteRepository.addChecklistItem(noteId!!, item.text)
                            }
                        }
                        NoteType.PHOTO -> {
                            _state.value = _state.value.copy(
                                isSaving = false,
                                error = "Photo editing is not yet supported"
                            )
                            return@launch
                        }
                    }
                } else {
                    noteId = when (noteType) {
                        NoteType.TEXT -> noteRepository.createTextNote(notebookId, content)
                        NoteType.CHECKLIST -> noteRepository.createChecklistNote(
                            notebookId,
                            _state.value.checklistItems.map { it.text }
                        )
                        NoteType.PHOTO -> {
                            _state.value = _state.value.copy(
                                isSaving = false,
                                error = "Photo notes are not yet supported"
                            )
                            return@launch
                        }
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
        _state.value = _state.value.copy(
            checklistItems = _state.value.checklistItems.map {
                if (it.id == itemId) it.copy(isDone = !it.isDone) else it
            }
        )
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
