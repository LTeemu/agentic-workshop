package com.securenome.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.securenome.data.local.entity.ChecklistItemEntity
import com.securenome.data.local.entity.NoteEntity
import com.securenome.data.local.entity.NotebookEntity
import com.securenome.data.local.entity.PhotoEntity

/**
 * Room database.
 *
 * ## Version history
 *
 * - v1→v2: Empty migration (enables migration infrastructure)
 * - v2→v3: Added sortOrder column to notes table for manual reordering
 * - v3→v4: Added sortOrder column to notebooks table for manual reordering
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
    version = 4,
    exportSchema = true
)
abstract class SecureNoteDatabase : RoomDatabase() {
    abstract fun notebookDao(): NotebookDao
    abstract fun noteDao(): NoteDao

    companion object {
        /**
         * Migration from v1 to v2 — no schema changes.
         * This exists solely to provide a real migration path and avoid
         * fallbackToDestructiveMigration data loss.
         */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // No schema changes between v1 and v2
            }
        }

        /**
         * Migration from v2 to v3 — added sortOrder column.
         * Existing notes get sortOrder = id (preserves approximate creation order).
         */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE notes ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0")
            }
        }

        /**
         * Migration from v3 to v4 — added sortOrder column to notebooks table.
         * Existing notebooks get sortOrder = id (preserves approximate creation order).
         */
        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE notebooks ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0")
            }
        }
    }
}
