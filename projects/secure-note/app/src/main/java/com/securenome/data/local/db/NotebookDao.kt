package com.securenome.data.local.db

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.securenome.data.local.entity.NotebookEntity
import kotlinx.coroutines.flow.Flow

/**
 * Room DAO for notebooks.
 *
 * ## Why Flow as return type?
 *
 * Flow makes DAO queries reactive: when the database changes,
 * Flow emits a new value automatically. This is one of the main
 * reasons to use Flow instead of LiveData.
 *
 * @see Flow
 * @see NotebookEntity
 */
@Dao
interface NotebookDao {

    /** Get all notebooks, ordered by manual sortOrder */
    @Query("SELECT * FROM notebooks ORDER BY sortOrder ASC")
    fun getAllNotebooks(): Flow<List<NotebookEntity>>

    /** Get a single notebook by id */
    @Query("SELECT * FROM notebooks WHERE id = :id")
    suspend fun getNotebookById(id: Long): NotebookEntity?

    /** Get the highest sortOrder in the table */
    @Query("SELECT COALESCE(MAX(sortOrder), 0) FROM notebooks")
    suspend fun getMaxSortOrder(): Int

    /** Update a notebook's sortOrder */
    @Query("UPDATE notebooks SET sortOrder = :sortOrder WHERE id = :id")
    suspend fun updateSortOrder(id: Long, sortOrder: Int)

    /** Find a notebook by exact title (case-insensitive). */
    @Query("SELECT * FROM notebooks WHERE LOWER(title) = LOWER(:title) LIMIT 1")
    suspend fun getNotebookByTitle(title: String): NotebookEntity?

    /** Insert a new notebook. Returns the created id. */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(notebook: NotebookEntity): Long

    /** Update an existing notebook */
    @Update
    suspend fun update(notebook: NotebookEntity)

    /** Delete a notebook */
    @Delete
    suspend fun delete(notebook: NotebookEntity)
}
