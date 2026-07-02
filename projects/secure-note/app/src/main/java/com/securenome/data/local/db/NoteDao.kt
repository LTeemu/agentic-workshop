package com.securenome.data.local.db

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.securenome.data.local.entity.ChecklistItemEntity
import com.securenome.data.local.entity.NoteEntity
import com.securenome.data.local.entity.NoteWithDetails
import com.securenome.data.local.entity.PhotoEntity
import kotlinx.coroutines.flow.Flow

/**
 * Room DAO for notes.
 *
 * @Transaction ensures that the checklist and photo data
 * from NoteWithDetails queries is consistent.
 */
@Dao
interface NoteDao {

    /** Get all notes in a notebook, most recently updated first */
    @Transaction
    @Query("SELECT * FROM notes WHERE notebookId = :notebookId ORDER BY updatedAt DESC")
    fun getNotesByNotebook(notebookId: Long): Flow<List<NoteWithDetails>>

    /** Get a single note with all its details */
    @Transaction
    @Query("SELECT * FROM notes WHERE id = :noteId")
    fun getNoteById(noteId: Long): Flow<NoteWithDetails?>

    /** Get a note by share code */
    @Query("SELECT * FROM notes WHERE shareCode = :shareCode")
    suspend fun getNoteByShareCode(shareCode: String): NoteEntity?

    // --- Note CRUD ---

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNote(note: NoteEntity): Long

    @Update
    suspend fun updateNote(note: NoteEntity)

    @Delete
    suspend fun deleteNote(note: NoteEntity)

    /** Update shareCode without loading the entire entity */
    @Query("UPDATE notes SET shareCode = :code WHERE id = :noteId")
    suspend fun updateShareCode(noteId: Long, code: String?)

    /** Get a single note one-shot (not Flow) */
    @Query("SELECT * FROM notes WHERE id = :noteId")
    suspend fun getNoteEntityById(noteId: Long): NoteEntity?

    // --- Checklist CRUD ---

    @Query("SELECT * FROM checklist_items WHERE noteId = :noteId")
    fun getChecklistItems(noteId: Long): Flow<List<ChecklistItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChecklistItem(item: ChecklistItemEntity): Long

    @Update
    suspend fun updateChecklistItem(item: ChecklistItemEntity)

    @Delete
    suspend fun deleteChecklistItem(item: ChecklistItemEntity)

    @Query("DELETE FROM checklist_items WHERE noteId = :noteId")
    suspend fun deleteAllChecklistItems(noteId: Long)

    // --- Photo CRUD ---

    @Query("SELECT * FROM photos WHERE noteId = :noteId")
    fun getPhotos(noteId: Long): Flow<List<PhotoEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhoto(photo: PhotoEntity): Long

    @Delete
    suspend fun deletePhoto(photo: PhotoEntity)
}
