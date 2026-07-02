package com.securenome.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for a notebook (folder).
 *
 * ## Why @Entity?
 *
 * Room converts @Entity classes into SQLite tables automatically.
 * Each field is its own column.
 *
 * ## Why data class?
 *
 * data class automatically provides equals(), hashCode(), toString()
 * and copy() — these are useful in Flow updates and tests.
 */
@Entity(tableName = "notebooks")
data class NotebookEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val createdAt: Long = System.currentTimeMillis()
)
