package com.securenome.data.local.entity

import androidx.room.Embedded
import androidx.room.Junction
import androidx.room.Relation

/**
 * Room relations: Note + its checklist items + photos.
 *
 * ## Why @Relation?
 *
 * Room can automatically join NoteEntity with its ChecklistItemEntities
 * and PhotoEntities. This replaces manual JOIN queries.
 * `@Junction` is unnecessary here — we use a direct foreign key relationship.
 *
 * ## How is this used?
 *
 * DAO returns Flow<List<NoteWithDetails>> and the ViewModel processes
 * these into a domain model.
 */
data class NoteWithDetails(
    @Embedded
    val note: NoteEntity,

    @Relation(
        parentColumn = "id",
        entityColumn = "noteId"
    )
    val checklistItems: List<ChecklistItemEntity> = emptyList(),

    @Relation(
        parentColumn = "id",
        entityColumn = "noteId"
    )
    val photos: List<PhotoEntity> = emptyList()
)
