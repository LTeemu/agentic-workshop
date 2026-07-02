package com.securenome.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * A single checklist item in a note.
 *
 * ## Why a separate entity?
 *
 * Checklist is a 1:N relationship to Note. One note can contain
 * many checklist items. A separate entity enables efficient
 * querying and updating without reading the entire note.
 *
 * ## Why is encryptedText a ByteArray?
 *
 * Like in NoteEntity — checklist text is encrypted before storage.
 * The isDone column is NOT encrypted because it is metadata (and does
 * not reveal medical data).
 */
@Entity(
    tableName = "checklist_items",
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
data class ChecklistItemEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val noteId: Long,
    val encryptedText: ByteArray,
    val isDone: Boolean = false
)
