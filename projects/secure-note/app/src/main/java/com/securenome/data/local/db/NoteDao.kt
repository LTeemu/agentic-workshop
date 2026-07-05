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

    /** Get all notes in a notebook, ordered by user-defined sort order */
    @Transaction
    @Query("SELECT * FROM notes WHERE notebookId = :notebookId ORDER BY sortOrder ASC")
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

    // --- Sorting ---

    /** Get the highest sortOrder for a notebook. */
    @Query("SELECT COALESCE(MAX(sortOrder), -1) FROM notes WHERE notebookId = :notebookId")
    suspend fun getMaxSortOrder(notebookId: Long): Int

    /** Update a single note's sortOrder. */
    @Query("UPDATE notes SET sortOrder = :sortOrder WHERE id = :noteId")
    suspend fun updateSortOrder(noteId: Long, sortOrder: Int)

    // --- Checklist CRUD ---

    @Query("SELECT * FROM checklist_items WHERE noteId = :noteId")
    fun getChecklistItems(noteId: Long): Flow<List<ChecklistItemEntity>>

    @Query("SELECT * FROM checklist_items WHERE id = :itemId")
    suspend fun getChecklistItemById(itemId: Long): ChecklistItemEntity?

    @Query("SELECT * FROM checklist_items WHERE noteId = :noteId")
    suspend fun getChecklistItemEntities(noteId: Long): List<ChecklistItemEntity>

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

    @Query("SELECT * FROM photos WHERE noteId = :noteId")
    suspend fun getPhotoEntities(noteId: Long): List<PhotoEntity>

    @Query("SELECT * FROM photos WHERE id = :photoId")
    suspend fun getPhotoEntityById(photoId: Long): PhotoEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhoto(photo: PhotoEntity): Long

    @Update
    suspend fun updatePhoto(photo: PhotoEntity)

    /** Targeted update for photo name — avoids reading/writing large BLOB fields. */
    @Query("UPDATE photos SET encryptedName = :name WHERE id = :photoId")
    suspend fun updatePhotoName(photoId: Long, name: ByteArray?)

    @Delete
    suspend fun deletePhoto(photo: PhotoEntity)

    /** Lightweight count query — avoids loading BLOB fields. */
    @Query("SELECT COUNT(*) FROM photos WHERE noteId = :noteId")
    suspend fun getPhotoCount(noteId: Long): Int
}
