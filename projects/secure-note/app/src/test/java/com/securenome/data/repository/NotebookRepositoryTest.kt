package com.securenome.data.repository

import com.securenome.data.local.db.NotebookDao
import com.securenome.data.local.entity.NotebookEntity
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for NotebookRepository.
 *
 * ## Why MockK?
 *
 * MockK is a Kotlin-first mocking library. It supports:
 * - `coEvery` / `coVerify` for coroutine functions
 * - `mockk()` without @Mock annotations
 * - Kotlin data classes with default parameters
 *
 * ## Why flowOf?
 *
 * `flowOf` creates a Flow that emits one value then completes.
 * Perfect for mocking DAO methods that return Flow<List>.
 */
class NotebookRepositoryTest {

    private val notebookDao: NotebookDao = mockk()
    private lateinit var repository: NotebookRepository

    @Before
    fun setUp() {
        repository = NotebookRepository(notebookDao)
    }

    @Test
    fun `allNotebooks returns notebooks from dao`() = runTest {
        val expected = listOf(
            NotebookEntity(id = 1, title = "Work"),
            NotebookEntity(id = 2, title = "Personal")
        )
        coEvery { notebookDao.getAllNotebooks() } returns flowOf(expected)

        val result = repository.allNotebooks.first()

        assertEquals("Repository must return DAO data", expected, result)
        coVerify { notebookDao.getAllNotebooks() }
    }

    @Test
    fun `getNotebook returns single notebook`() = runTest {
        val expected = NotebookEntity(id = 1, title = "Test")
        coEvery { notebookDao.getNotebookById(1) } returns expected

        val result = repository.getNotebook(1)

        assertEquals("Must return the correct notebook", expected, result)
    }

    @Test
    fun `getNotebook returns null when not found`() = runTest {
        coEvery { notebookDao.getNotebookById(999) } returns null

        val result = repository.getNotebook(999)

        assertNull("Non-existent notebook must return null", result)
    }

    @Test
    fun `createNotebook inserts and returns id`() = runTest {
        coEvery { notebookDao.insert(any<NotebookEntity>()) } returns 1L

        val id = repository.createNotebook("New notebook")

        assertEquals("createNotebook must return the created id", 1L, id)
        coVerify {
            notebookDao.insert(withArg { entity ->
                assertEquals("Title must be passed through", "New notebook", entity.title)
            })
        }
    }

    @Test
    fun `deleteNotebook calls dao delete`() = runTest {
        val notebook = NotebookEntity(id = 1, title = "To delete")
        coEvery { notebookDao.delete(notebook) } returns Unit

        repository.deleteNotebook(notebook)

        coVerify { notebookDao.delete(notebook) }
    }
}
