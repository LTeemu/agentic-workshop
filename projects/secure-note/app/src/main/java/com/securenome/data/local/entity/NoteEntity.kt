package com.securenome.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Note type: text, checklist, or photo.
 */
enum class NoteType {
    TEXT,
    CHECKLIST,
    PHOTO
}

/**
 * Room entity for a note.
 *
 * ## Why ForeignKey?
 *
 * note.notebookId references the notebooks.id column. ForeignKey ensures
 * referential integrity: you cannot create a note for a non-existent notebook.
 * `onDelete = Cascade` deletes all notes when the notebook is deleted.
 *
 * ## Why is encryptedContent a ByteArray?
 *
 * ByteArray is raw data — convenient for encryption. Unencrypted content
 * is transformed into an encrypted byte array before storage.
 *
 * ## Why is shareCode a nullable String?
 *
 * Only shared notes have a share code. null means "not shared".
 */
@Entity(
    tableName = "notes",
    foreignKeys = [
        ForeignKey(
            entity = NotebookEntity::class,
            parentColumns = ["id"],
            childColumns = ["notebookId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("notebookId")]
)
data class NoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val notebookId: Long,
    val type: NoteType = NoteType.TEXT,
    val encryptedContent: ByteArray,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val shareCode: String? = null
)
