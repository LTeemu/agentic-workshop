package com.securenome.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.securenome.data.local.entity.ChecklistItemEntity
import com.securenome.data.local.entity.NoteEntity
import com.securenome.data.local.entity.NotebookEntity
import com.securenome.data.local.entity.PhotoEntity

/**
 * Room database.
 *
 * ## Why version 1?
 *
 * The version increases whenever the schema changes. Production uses
 * Migration objects, development uses fallbackToDestructiveMigration.
 *
 * ## Why are all entities listed?
 *
 * Room needs all entities in the @Database annotation
 * so it can create the tables and manage referential integrity.
 */
@Database(
    entities = [
        NotebookEntity::class,
        NoteEntity::class,
        ChecklistItemEntity::class,
        PhotoEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class SecureNoteDatabase : RoomDatabase() {
    abstract fun notebookDao(): NotebookDao
    abstract fun noteDao(): NoteDao
}
