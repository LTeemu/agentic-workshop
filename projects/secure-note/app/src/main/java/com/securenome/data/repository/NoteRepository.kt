package com.securenome.data.repository

import com.securenome.data.local.db.NoteDao
import com.securenome.data.local.entity.ChecklistItemEntity
import com.securenome.data.local.entity.NoteEntity
import com.securenome.data.local.entity.NoteType
import com.securenome.data.local.entity.NoteWithDetails
import com.securenome.data.local.entity.PhotoEntity
import com.securenome.security.CryptoManager
import kotlinx.coroutines.flow.Flow
import java.security.SecureRandom
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for note operations.
 *
 * This layer handles encryption transparently: the ViewModel calls
 * the repository, the repository encrypts before saving and decrypts
 * before returning.
 */
@Singleton
class NoteRepository @Inject constructor(
    private val noteDao: NoteDao,
    private val cryptoManager: CryptoManager
) {
    fun getNotesByNotebook(notebookId: Long): Flow<List<NoteWithDetails>> =
        noteDao.getNotesByNotebook(notebookId)

    fun getNoteById(noteId: Long): Flow<NoteWithDetails?> =
        noteDao.getNoteById(noteId)

    suspend fun createTextNote(
        notebookId: Long,
        plainText: String
    ): Long {
        val encrypted = cryptoManager.encrypt(plainText.toByteArray())
        val note = NoteEntity(
            notebookId = notebookId,
            type = NoteType.TEXT,
            encryptedContent = encrypted
        )
        return noteDao.insertNote(note)
    }

    suspend fun updateTextNote(noteId: Long, plainText: String) {
        val existing = noteDao.getNoteEntityById(noteId) ?: return
        val encrypted = cryptoManager.encrypt(plainText.toByteArray())
        noteDao.updateNote(
            existing.copy(
                encryptedContent = encrypted,
                updatedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun createChecklistNote(
        notebookId: Long,
        items: List<String>
    ): Long {
        // Empty encrypted content — checklist data is in separate rows
        val encrypted = cryptoManager.encrypt(byteArrayOf())
        val noteId = noteDao.insertNote(
            NoteEntity(
                notebookId = notebookId,
                type = NoteType.CHECKLIST,
                encryptedContent = encrypted
            )
        )
        // Insert checklist items
        for (text in items) {
            noteDao.insertChecklistItem(
                ChecklistItemEntity(
                    noteId = noteId,
                    encryptedText = cryptoManager.encrypt(text.toByteArray())
                )
            )
        }
        return noteId
    }

    suspend fun addChecklistItem(noteId: Long, text: String): Long {
        return noteDao.insertChecklistItem(
            ChecklistItemEntity(
                noteId = noteId,
                encryptedText = cryptoManager.encrypt(text.toByteArray())
            )
        )
    }

    suspend fun toggleChecklistItem(item: ChecklistItemEntity) {
        noteDao.updateChecklistItem(item.copy(isDone = !item.isDone))
    }

    suspend fun deleteChecklistItem(item: ChecklistItemEntity) {
        noteDao.deleteChecklistItem(item)
    }

    suspend fun deleteAllChecklistItems(noteId: Long) {
        noteDao.deleteAllChecklistItems(noteId)
    }

    suspend fun addPhoto(noteId: Long, imageBytes: ByteArray): Long {
        return noteDao.insertPhoto(
            PhotoEntity(
                noteId = noteId,
                encryptedImageBytes = cryptoManager.encrypt(imageBytes),
                thumbnailBytes = cryptoManager.encrypt(createThumbnail(imageBytes))
            )
        )
    }

    suspend fun deletePhoto(photo: PhotoEntity) {
        noteDao.deletePhoto(photo)
    }

    suspend fun deleteNote(note: NoteEntity) {
        noteDao.deleteNote(note)
    }

    /** Get a single note entity one-shot (not a Flow). */
    suspend fun getNoteEntityById(noteId: Long): NoteEntity? =
        noteDao.getNoteEntityById(noteId)

    suspend fun revokeShareCode(noteId: Long) {
        noteDao.updateShareCode(noteId, null)
    }

    /** Set the share code for a note to a specific value. */
    suspend fun setShareCode(noteId: Long, code: String?) {
        noteDao.updateShareCode(noteId, code)
    }

    suspend fun generateShareCode(noteId: Long): String? {
        val existing = noteDao.getNoteEntityById(noteId) ?: return null

        // If code already exists, return it
        if (existing.shareCode != null) return existing.shareCode

        // 8-character token: e.g. "A3F9-K2B1"
        val random = SecureRandom()
        val token = (1..4).map {
            val letter = ('A'.code + random.nextInt(26)).toChar()
            val digit = random.nextInt(10)
            "$letter$digit"
        }.joinToString("-")

        noteDao.updateShareCode(noteId, token)
        return token
    }

    private fun createThumbnail(imageBytes: ByteArray): ByteArray {
        // Simple thumbnail: use original image at reduced size.
        // In a real app, this would scale the Bitmap.
        // On Android, this is done via BitmapFactory.decodeByteArray +
        // Bitmap.createScaledBitmap + ByteArrayOutputStream.
        // For simplicity, return the original imageBytes.
        return imageBytes
    }
}
