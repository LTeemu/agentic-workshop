package com.securenome.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Photo attached to a note.
 *
 * ## Why a separate entity instead of ByteArray in NoteEntity?
 *
 * 1. **Performance:** Images can be large (MB). Loading them
 *    every time with NoteEntity would slow down listing.
 * 2. **Lazy loading:** We can fetch images only when needed.
 * 3. **Multiple images:** One note can contain multiple photos.
 *
 * ## Why encryptedImageBytes?
 *
 * Images are encrypted just like text — a photo containing medical data
 * (e.g. from a prescription) must be protected the same way.
 */
@Entity(
    tableName = "photos",
    foreignKeys = [
        ForeignKey(
            entity = NoteEntity::class,
            parentColumns = ["id"],
            childColumns = ["noteId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("noteId")]
)
data class PhotoEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val noteId: Long,
    val encryptedImageBytes: ByteArray,
    val thumbnailBytes: ByteArray? = null, // Small preview, encrypted
    /** Encrypted photo name. Null = auto-name "Photo N". */
    val encryptedName: ByteArray? = null,
    val createdAt: Long = System.currentTimeMillis()
)
