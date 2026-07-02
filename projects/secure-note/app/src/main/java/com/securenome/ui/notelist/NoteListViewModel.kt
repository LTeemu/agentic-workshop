package com.securenome.ui.notelist

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.entity.NoteType
import com.securenome.data.repository.NoteRepository
import com.securenome.data.share.ShareManager
import com.securenome.security.CryptoManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Note list ViewModel.
 *
 * ## Why CryptoManager here instead of the repository?
 *
 * Decryption happens only in the UI layer because:
 * 1. The repository may be shared across multiple ViewModels
 * 2. Decryption is a UI need (displaying unencrypted text)
 * 3. Flow's map() transformation is a natural place for decryption
 *
 * ## Why SavedStateHandle?
 *
 * SavedStateHandle preserves values across config changes (screen rotation)
 * and even process restarts. notebookId comes as a navigation argument,
 * and it lives here rather than as a parameter.
 */
data class NoteSummary(
    val id: Long,
    val type: NoteType,
    val preview: String, // First 50 characters decrypted
    val hasChecklist: Boolean,
    val photoCount: Int,
    val updatedAt: Long,
    val shareCode: String?
)

@HiltViewModel
class NoteListViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val noteRepository: NoteRepository,
    private val cryptoManager: CryptoManager,
    private val shareManager: ShareManager
) : ViewModel() {

    private val notebookId: Long = savedStateHandle["notebookId"] ?: -1L

    /**
     * Notes as summaries.
     *
     * ## Why flowOn(Dispatchers.Default)?
     *
     * Decryption is CPU-intensive. flowOn moves the map operation
     * to a background thread so the UI thread is not blocked.
     */
    val noteSummaries: StateFlow<List<NoteSummary>> =
        noteRepository.getNotesByNotebook(notebookId)
            .map { notesWithDetails ->
                notesWithDetails.map { detail ->
                    val preview = try {
                        String(cryptoManager.decrypt(detail.note.encryptedContent))
                            .take(80)
                    } catch (e: Exception) {
                        "(decryption error)"
                    }
                    NoteSummary(
                        id = detail.note.id,
                        type = detail.note.type,
                        preview = preview,
                        hasChecklist = detail.checklistItems.isNotEmpty(),
                        photoCount = detail.photos.size,
                        updatedAt = detail.note.updatedAt,
                        shareCode = detail.note.shareCode
                    )
                }
            }
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = emptyList()
            )

    fun deleteNote(noteId: Long) {
        viewModelScope.launch {
            noteRepository.getNoteById(noteId).collect { noteWithDetails ->
                noteWithDetails?.let {
                    noteRepository.deleteNote(it.note)
                    return@collect
                }
            }
        }
    }

    /**
     * Toggle sharing for a note.
     *
     * If the note already has a share code, revoke it (turn sharing off).
     * If it doesn't have one, generate a new share code.
     */
    fun toggleShare(noteId: Long, currentShareCode: String?) {
        viewModelScope.launch {
            if (currentShareCode != null) {
                // Turn sharing off: revoke on server + clear local code
                shareManager.revokeShare(currentShareCode)
                noteRepository.setShareCode(noteId, null)
            } else {
                // Turn sharing on: generate code (also uploads to server if available)
                val note = noteRepository.getNoteEntityById(noteId) ?: return@launch
                val plaintext = String(cryptoManager.decrypt(note.encryptedContent))
                val noteData = buildString {
                    appendLine("type=${note.type}")
                    appendLine(plaintext)
                }
                val shareCode = shareManager.createShare(noteData.toByteArray())
                if (shareCode != null) {
                    noteRepository.setShareCode(noteId, shareCode)
                }
            }
        }
    }

    /** Get a single note's share code synchronously. */
    suspend fun getShareCode(noteId: Long): String? {
        return noteRepository.getNoteEntityById(noteId)?.shareCode
    }
}
