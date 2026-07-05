package com.securenome.data.repository

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.securenome.data.local.db.NoteDao
import com.securenome.data.local.entity.ChecklistItemEntity
import com.securenome.data.local.entity.NoteEntity
import com.securenome.data.local.entity.NoteType
import com.securenome.data.local.entity.NoteWithDetails
import com.securenome.data.local.entity.PhotoEntity
import com.securenome.security.CryptoManager
import kotlinx.coroutines.flow.Flow
import java.io.ByteArrayOutputStream
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

    private suspend fun nextSortOrder(notebookId: Long): Int =
        noteDao.getMaxSortOrder(notebookId) + 1

    suspend fun createTextNote(
        notebookId: Long,
        plainText: String
    ): Long {
        val encrypted = cryptoManager.encrypt(plainText.toByteArray())
        val note = NoteEntity(
            notebookId = notebookId,
            type = NoteType.TEXT,
            encryptedContent = encrypted,
            sortOrder = nextSortOrder(notebookId)
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
                encryptedContent = encrypted,
                sortOrder = nextSortOrder(notebookId)
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

    suspend fun addChecklistItem(noteId: Long, text: String, isDone: Boolean = false): Long {
        return noteDao.insertChecklistItem(
            ChecklistItemEntity(
                noteId = noteId,
                encryptedText = cryptoManager.encrypt(text.toByteArray()),
                isDone = isDone
            )
        )
    }

    /** Get all checklist items for a note (one-shot, not a Flow). */
    suspend fun getChecklistItemEntities(noteId: Long): List<ChecklistItemEntity> =
        noteDao.getChecklistItemEntities(noteId)

    suspend fun toggleChecklistItem(item: ChecklistItemEntity) {
        noteDao.updateChecklistItem(item.copy(isDone = !item.isDone))
    }

    suspend fun deleteChecklistItem(item: ChecklistItemEntity) {
        noteDao.deleteChecklistItem(item)
    }

    suspend fun getChecklistItemEntityById(itemId: Long): ChecklistItemEntity? =
        noteDao.getChecklistItemById(itemId)

    suspend fun deleteAllChecklistItems(noteId: Long) {
        noteDao.deleteAllChecklistItems(noteId)
    }

    suspend fun addPhoto(noteId: Long, imageBytes: ByteArray, thumbnailBytes: ByteArray? = null): Long {
        val thumb = thumbnailBytes ?: createThumbnail(imageBytes)
        return noteDao.insertPhoto(
            PhotoEntity(
                noteId = noteId,
                encryptedImageBytes = cryptoManager.encrypt(imageBytes),
                thumbnailBytes = cryptoManager.encrypt(thumb)
            )
        )
    }

    suspend fun deletePhoto(photo: PhotoEntity) {
        noteDao.deletePhoto(photo)
    }

    /** Get all photo entities for a note. */
    suspend fun getPhotoEntities(noteId: Long): List<PhotoEntity> =
        noteDao.getPhotoEntities(noteId)

    /** Get a single photo entity by ID. */
    suspend fun getPhotoEntityById(photoId: Long): PhotoEntity? =
        noteDao.getPhotoEntityById(photoId)

    suspend fun deleteNote(note: NoteEntity) {
        noteDao.deleteNote(note)
    }

    /** Get a single note entity one-shot (not a Flow). */
    suspend fun getNoteEntityById(noteId: Long): NoteEntity? =
        noteDao.getNoteEntityById(noteId)

    /**
     * Reorder notes by assigning sequential sortOrder values.
     * The list of note IDs defines the new order (first = lowest sortOrder).
     */
    suspend fun reorderNotes(noteIds: List<Long>) {
        for ((index, noteId) in noteIds.withIndex()) {
            noteDao.updateSortOrder(noteId, index)
        }
    }

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

    /**
     * Create a thumbnail by scaling the image to max 256px on the longest edge.
     *
     * Uses [BitmapFactory] to decode the original image and [Bitmap.createScaledBitmap]
     * to downscale. Keeps aspect ratio. Returns JPEG-compressed bytes.
     */
    fun createThumbnail(imageBytes: ByteArray): ByteArray {
        // First decode just the bounds to calculate scale
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)

        val origWidth = options.outWidth
        val origHeight = options.outHeight
        if (origWidth <= 0 || origHeight <= 0) return imageBytes

        val maxThumbSize = 256
        val scale = maxOf(origWidth, origHeight).toFloat() / maxThumbSize
        val thumbWidth = (origWidth / scale).toInt().coerceAtLeast(1)
        val thumbHeight = (origHeight / scale).toInt().coerceAtLeast(1)

        // Decode full image
        val fullBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
            ?: return imageBytes

        // Scale down
        val thumbBitmap = Bitmap.createScaledBitmap(fullBitmap, thumbWidth, thumbHeight, true)

        // Compress to JPEG
        val outputStream = ByteArrayOutputStream()
        thumbBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val result = outputStream.toByteArray()

        // Recycle to free memory
        thumbBitmap.recycle()
        fullBitmap.recycle()

        return result
    }
}
