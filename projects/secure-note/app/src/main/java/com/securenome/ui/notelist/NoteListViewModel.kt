package com.securenome.ui.notelist

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.datastore.SettingsDataStore
import com.securenome.data.local.entity.NoteType
import com.securenome.data.repository.NoteRepository
import com.securenome.data.share.ShareManager
import com.securenome.security.CryptoManager
import java.util.Base64
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
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
    val preview: String, // Decrypted preview text
    val hasChecklist: Boolean,
    val photoCount: Int,
    val photoNames: List<String>,
    val updatedAt: Long,
    val shareCode: String?
)

@HiltViewModel
class NoteListViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val noteRepository: NoteRepository,
    private val cryptoManager: CryptoManager,
    private val shareManager: ShareManager,
    private val settingsDataStore: SettingsDataStore
) : ViewModel() {

    private val notebookId: Long = savedStateHandle["notebookId"] ?: -1L

    init {
        retryPendingRevocations()
    }

    /** ID of the note currently toggling its share status, or null if idle. */
    private val _sharingLoadingNoteId = MutableStateFlow<Long?>(null)
    val sharingLoadingNoteId: StateFlow<Long?> = _sharingLoadingNoteId.asStateFlow()

    /**
     * Current search query (empty = show all).
     */
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    /**
     * All notes as summaries (before search filter).
     *
     * ## Why flowOn(Dispatchers.Default)?
     *
     * Decryption is CPU-intensive. flowOn moves the map operation
     * to a background thread so the UI thread is not blocked.
     */
    private val allNoteSummaries: StateFlow<List<NoteSummary>> =
        noteRepository.getNotesByNotebook(notebookId)
            .map { notesWithDetails ->
                notesWithDetails.map { detail ->
                    val photoNames = detail.photos.mapNotNull { photo ->
                        photo.encryptedName?.let {
                            try { String(cryptoManager.decrypt(it)).trim() } catch (_: Exception) { null }
                        }
                    }
                    val preview = when (detail.note.type) {
                        NoteType.CHECKLIST -> {
                            val texts = detail.checklistItems.mapNotNull { item ->
                                try {
                                    String(cryptoManager.decrypt(item.encryptedText)).trim()
                                } catch (_: Exception) { null }
                            }
                            val base = if (texts.isEmpty()) "(empty)" else texts.joinToString(" · ").take(80)
                            if (photoNames.isNotEmpty()) "$base | ${photoNames.joinToString(", ").take(40)}"
                            else base
                        }
                        else -> try {
                            val base = String(cryptoManager.decrypt(detail.note.encryptedContent))
                                .trim()
                                .take(80)
                            if (photoNames.isNotEmpty()) "$base | ${photoNames.joinToString(", ").take(40)}"
                            else base
                        } catch (e: Exception) {
                            "(decryption error)"
                        }
                    }
                    NoteSummary(
                        id = detail.note.id,
                        type = detail.note.type,
                        preview = preview,
                        hasChecklist = detail.checklistItems.isNotEmpty(),
                        photoCount = detail.photos.size,
                        photoNames = photoNames,
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

    /**
     * Whether the current notebook has any notes at all (before search filtering).
     * Used by UI to show the right empty-state message.
     */
    val totalNoteCount: StateFlow<Int> = allNoteSummaries
        .map { it.size }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    /**
     * Filtered note summaries based on search query.
     * When query is empty, shows all notes.
     * Matches case-insensitively against preview text AND note type label
     * ("text" for text/photo, "checklist" for checklist).
     */
    val noteSummaries: StateFlow<List<NoteSummary>> =
        combine(allNoteSummaries, _searchQuery) { notes, query ->
            if (query.isBlank()) notes
            else notes.filter { note ->
                note.preview.contains(query, ignoreCase = true) ||
                typeLabel(note.type).contains(query, ignoreCase = true) ||
                note.photoNames.any { it.contains(query, ignoreCase = true) }
            }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )

    /** Update the search query. */
    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    /** User-facing label for a note type. Must match what NoteCard shows. */
    private fun typeLabel(type: NoteType): String = when (type) {
        NoteType.TEXT, NoteType.PHOTO -> "Text"
        NoteType.CHECKLIST -> "Checklist"
    }

    /**
     * Persist a new manual ordering of notes.
     * Called when the user finishes a drag-and-drop reorder.
     */
    fun reorderNotes(noteIds: List<Long>) {
        viewModelScope.launch {
            noteRepository.reorderNotes(noteIds)
        }
    }

    fun deleteNote(noteId: Long) {
        viewModelScope.launch {
            val note = noteRepository.getNoteEntityById(noteId) ?: return@launch
            noteRepository.deleteNote(note)
        }
    }

    /** Whether the master sharing toggle is enabled. */
    val sharingEnabled: StateFlow<Boolean> =
        settingsDataStore.sharingEnabled
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), true)

    /**
     * Toggle sharing for a note.
     *
     * If the note already has a share code, revoke it (turn sharing off).
     * If it doesn't have one, generate a new share code.
     *
     * ## Pending revocations
     *
     * If the server DELETE fails (server down), the share code is queued
     * as a "pending revocation" and retried later (see [retryPendingRevocations]).
     * The local share code is cleared immediately so the UI shows the note
     * as unshared.
     */
    fun toggleShare(noteId: Long, currentShareCode: String?) {
        _sharingLoadingNoteId.value = noteId
        viewModelScope.launch {
            try {
                // Master toggle check — silently no-op if sharing is disabled
                if (!settingsDataStore.sharingEnabled.first()) return@launch
                if (currentShareCode != null) {
                    // Turn sharing off: revoke on server + clear local code
                    val result = shareManager.revokeShare(currentShareCode)
                    noteRepository.setShareCode(noteId, null)
                    // If server DELETE failed, queue for retry
                    if (result.isFailure) {
                        settingsDataStore.addPendingRevocation(noteId, currentShareCode)
                    }
                } else {
                    // Turn sharing on: generate code (also uploads to server if available)
                    val note = noteRepository.getNoteEntityById(noteId) ?: return@launch
                    val plaintext = String(cryptoManager.decrypt(note.encryptedContent))
                    val noteData = buildString {
                        appendLine("type=${note.type}")
                        appendLine(plaintext)
                        // Include checklist items for checklist notes
                        if (note.type == NoteType.CHECKLIST) {
                            val items = noteRepository.getChecklistItemEntities(noteId)
                            for (item in items) {
                                val decrypted = String(cryptoManager.decrypt(item.encryptedText))
                                appendLine("item=$decrypted||${item.isDone}")
                            }
                        }
                        // Include photos (encrypted bytes are part of the payload,
                        // re-encrypted as a whole by ShareManager)
                        val photos = noteRepository.getPhotoEntities(noteId)
                        for (photo in photos) {
                            val b64Bytes = Base64.getEncoder().encodeToString(photo.encryptedImageBytes)
                            val b64Thumb = photo.thumbnailBytes?.let {
                                Base64.getEncoder().encodeToString(it)
                            } ?: ""
                            val b64Name = photo.encryptedName?.let {
                                Base64.getEncoder().encodeToString(it)
                            } ?: ""
                            appendLine("photo=$b64Bytes||$b64Thumb||${photo.createdAt}||$b64Name")
                        }
                    }
                    val shareCode = shareManager.createShare(noteData.toByteArray())
                    if (shareCode != null) {
                        noteRepository.setShareCode(noteId, shareCode)
                    }
                }
            } finally {
                _sharingLoadingNoteId.value = null
            }
        }
    }

    /**
     * Retry pending revocations that failed due to server unavailability.
     *
     * Called on ViewModel initialization. Tries each pending DELETE,
     * removes from the queue on success, keeps for next retry on failure.
     */
    private fun retryPendingRevocations() {
        viewModelScope.launch {
            val pending = settingsDataStore.getPendingRevocations()
            if (pending.isEmpty()) return@launch
            for (revocation in pending) {
                val result = shareManager.revokeShare(revocation.shareCode)
                if (result.isSuccess) {
                    settingsDataStore.removePendingRevocation(revocation.noteId)
                }
                // On failure, leave in the queue for next retry
            }
        }
    }

    /** Get a single note's share code synchronously. */
    suspend fun getShareCode(noteId: Long): String? {
        return noteRepository.getNoteEntityById(noteId)?.shareCode
    }

    /**
     * Import a note from a share code and save it to this notebook.
     *
     * Share data format:
     *   type=TEXT\n
     *   <plain text content>
     */
    suspend fun importNote(notebookId: Long, code: String) {
        // Master toggle check
        if (!settingsDataStore.sharingEnabled.first()) {
            throw Exception("Sharing is disabled in Settings")
        }
        val encryptedData = shareManager.importShare(code)
            ?: throw Exception("No note found for code $code")

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

        val itemTexts = mutableListOf<String>()
        val itemDone = mutableListOf<Boolean>()
        for (line in lines.filter { it.startsWith("item=") }) {
            val parts = line.removePrefix("item=").split("||")
            itemTexts.add(parts[0].trim())
            itemDone.add(parts.getOrNull(1)?.toBooleanStrictOrNull() ?: false)
        }

        // Extract photo data — encrypted bytes re-encrypted as part of share payload
        data class PhotoShare(
            val encryptedBytes: ByteArray,
            val encryptedThumb: ByteArray?,
            val encryptedName: ByteArray?,
            val createdAt: Long
        )
        val photoShares = lines.filter { it.startsWith("photo=") }.map { line ->
            val parts = line.removePrefix("photo=").split("||")
            val b64Bytes = parts.getOrNull(0) ?: return@map null
            val b64Thumb = parts.getOrNull(1)?.takeIf { it.isNotEmpty() }
            val createdAt = parts.getOrNull(2)?.toLongOrNull() ?: System.currentTimeMillis()
            val b64Name = parts.getOrNull(3)?.takeIf { it.isNotEmpty() }
            PhotoShare(
                encryptedBytes = Base64.getDecoder().decode(b64Bytes),
                encryptedThumb = b64Thumb?.let { Base64.getDecoder().decode(it) },
                encryptedName = b64Name?.let { Base64.getDecoder().decode(it) },
                createdAt = createdAt
            )
        }.filterNotNull()

        val newNoteId: Long = when (noteType) {
            NoteType.CHECKLIST -> {
                val noteId = noteRepository.createChecklistNote(notebookId, itemTexts)
                // Toggle done items after creation (all start as not done)
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
            // PHOTO is legacy — imported as TEXT
            NoteType.TEXT, NoteType.PHOTO -> noteRepository.createTextNote(notebookId, content)
        }

        // Save imported photos — decrypt with CryptoManager (same key),
        // then re-encrypt for the new note via addPhoto()
        // Decrypt name to pass plaintext to addPhoto (it re-encrypts)
        for (photoShare in photoShares) {
            val imageBytes = cryptoManager.decrypt(photoShare.encryptedBytes)
            val thumbBytes = photoShare.encryptedThumb?.let {
                cryptoManager.decrypt(it)
            } ?: noteRepository.createThumbnail(imageBytes)
            val name = photoShare.encryptedName?.let {
                try { String(cryptoManager.decrypt(it)) } catch (_: Exception) { null }
            }
            noteRepository.addPhoto(newNoteId, imageBytes, thumbBytes, name)
        }
    }
}
