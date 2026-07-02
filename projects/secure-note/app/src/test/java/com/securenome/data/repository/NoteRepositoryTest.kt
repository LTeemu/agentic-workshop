package com.securenome.data.repository

import com.securenome.data.local.db.NoteDao
import com.securenome.data.local.entity.ChecklistItemEntity
import com.securenome.data.local.entity.NoteEntity
import com.securenome.data.local.entity.NoteType
import com.securenome.data.local.entity.NoteWithDetails
import com.securenome.data.local.entity.PhotoEntity
import com.securenome.security.CryptoManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for NoteRepository.
 *
 * Tests verify that encryption is applied before storage and
 * that the repository correctly delegates to the DAO.
 */
class NoteRepositoryTest {

    private val noteDao: NoteDao = mockk()
    private val cryptoManager: CryptoManager = mockk()
    private lateinit var repository: NoteRepository

    @Before
    fun setUp() {
        repository = NoteRepository(noteDao, cryptoManager)
    }

    @Test
    fun `getNotesByNotebook returns dao data`() = runTest {
        val notebookId = 1L
        val expected = listOf(
            NoteWithDetails(
                note = NoteEntity(id = 1, notebookId = 1, type = NoteType.TEXT, encryptedContent = byteArrayOf(1, 2, 3))
            )
        )
        coEvery { noteDao.getNotesByNotebook(notebookId) } returns flowOf(expected)

        val result = repository.getNotesByNotebook(notebookId).first()

        assertEquals(expected, result)
        coVerify { noteDao.getNotesByNotebook(notebookId) }
    }

    @Test
    fun `createTextNote encrypts content before saving`() = runTest {
        val notebookId = 1L
        val plainText = "Hello, this is a note!"
        val encryptedBytes = byteArrayOf(1, 2, 3, 4, 5)

        every { cryptoManager.encrypt(plainText.toByteArray()) } returns encryptedBytes
        coEvery { noteDao.insertNote(any<NoteEntity>()) } returns 1L

        val id = repository.createTextNote(notebookId, plainText)

        assertEquals(1L, id)
        coVerify {
            noteDao.insertNote(withArg { note ->
                assertEquals(notebookId, note.notebookId)
                assertEquals(NoteType.TEXT, note.type)
                assertArrayEquals(encryptedBytes, note.encryptedContent)
            })
        }
    }

    @Test
    fun `createChecklistNote encrypts each item`() = runTest {
        val notebookId = 1L
        val items = listOf("Item 1", "Item 2")
        val encryptedEmpty = byteArrayOf(0)
        val encryptedItem1 = byteArrayOf(1)
        val encryptedItem2 = byteArrayOf(2)

        every { cryptoManager.encrypt(byteArrayOf()) } returns encryptedEmpty
        every { cryptoManager.encrypt("Item 1".toByteArray()) } returns encryptedItem1
        every { cryptoManager.encrypt("Item 2".toByteArray()) } returns encryptedItem2
        coEvery { noteDao.insertNote(any<NoteEntity>()) } returns 1L
        coEvery { noteDao.insertChecklistItem(any<ChecklistItemEntity>()) } returns 1L

        val id = repository.createChecklistNote(notebookId, items)

        assertEquals(1L, id)
        coVerify(exactly = 1) { noteDao.insertNote(any()) }
        coVerify(exactly = 2) { noteDao.insertChecklistItem(any()) }
    }

    @Test
    fun `addPhoto encrypts image bytes`() = runTest {
        val noteId = 1L
        val imageBytes = byteArrayOf(10, 20, 30)
        val encryptedImage = byteArrayOf(1, 1, 1)
        val encryptedThumbnail = byteArrayOf(2, 2, 2)

        every { cryptoManager.encrypt(imageBytes) } returns encryptedImage
        every { cryptoManager.encrypt(any<ByteArray>()) } returns encryptedThumbnail
        coEvery { noteDao.insertPhoto(any<PhotoEntity>()) } returns 1L

        val id = repository.addPhoto(noteId, imageBytes)

        assertEquals(1L, id)
        coVerify {
            noteDao.insertPhoto(withArg { photo ->
                assertEquals(noteId, photo.noteId)
                assertArrayEquals(encryptedImage, photo.encryptedImageBytes)
            })
        }
    }

    @Test
    fun `generateShareCode returns existing code if present`() = runTest {
        val noteId = 1L
        val existingCode = "ABC1-DEF2"
        coEvery { noteDao.getNoteEntityById(noteId) } returns NoteEntity(
            id = noteId, notebookId = 1, type = NoteType.TEXT,
            encryptedContent = byteArrayOf(), shareCode = existingCode
        )

        val code = repository.generateShareCode(noteId)

        assertEquals(existingCode, code)
        coVerify(exactly = 0) { noteDao.updateShareCode(any(), any()) }
    }

    @Test
    fun `generateShareCode creates new code when none exists`() = runTest {
        val noteId = 1L
        coEvery { noteDao.getNoteEntityById(noteId) } returns NoteEntity(
            id = noteId, notebookId = 1, type = NoteType.TEXT,
            encryptedContent = byteArrayOf(), shareCode = null
        )
        coEvery { noteDao.updateShareCode(any(), any()) } returns Unit

        val code = repository.generateShareCode(noteId)

        assertNotNull("Share code must be generated", code)
        assertTrue("Share code must match pattern XXXX-XXXX", code!!.matches(Regex("[A-Z0-9]{4}-[A-Z0-9]{4}")))
        coVerify { noteDao.updateShareCode(noteId, code) }
    }

    @Test
    fun `generateShareCode returns null for non-existent note`() = runTest {
        coEvery { noteDao.getNoteEntityById(999) } returns null

        val code = repository.generateShareCode(999)

        assertNull("Non-existent note must return null", code)
    }
}
