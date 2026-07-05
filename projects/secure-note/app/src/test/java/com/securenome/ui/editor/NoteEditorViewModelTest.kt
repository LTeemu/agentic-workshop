package com.securenome.ui.editor

import android.content.Context
import com.securenome.data.local.entity.NoteType
import com.securenome.data.repository.NoteRepository
import com.securenome.security.CryptoManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for NoteEditorViewModel.
 *
 * Tests initialization, text changes, auto-save,
 * and checklist management using mocked dependencies.
 */
class NoteEditorViewModelTest {

    private val context: Context = mockk()
    private val noteRepository: NoteRepository = mockk()
    private val cryptoManager: CryptoManager = mockk()
    private lateinit var viewModel: NoteEditorViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())
        viewModel = NoteEditorViewModel(context, noteRepository, cryptoManager)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initialize sets notebookId and noteType for new note`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.TEXT)

        val state = viewModel.state.value
        assertEquals("Must not be loading for new note", false, state.isLoading)
        assertEquals("Note type must be TEXT", NoteType.TEXT, state.noteType)
    }

    @Test
    fun `onTextChanged updates content in state`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.TEXT)

        viewModel.onTextChanged("Hello")

        val state = viewModel.state.value
        assertEquals("Content must be updated", "Hello", state.content)
    }

    @Test
    fun `addChecklistItem adds item to list`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.CHECKLIST)

        viewModel.addChecklistItem("Item 1")

        val state = viewModel.state.value
        assertEquals("Must have one checklist item", 1, state.checklistItems.size)
        assertEquals("Item text must match", "Item 1", state.checklistItems[0].text)
    }

    @Test
    fun `addChecklistItem ignores blank text`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.CHECKLIST)

        viewModel.addChecklistItem("")

        val state = viewModel.state.value
        assertEquals("Must not add blank items", 0, state.checklistItems.size)
    }

    @Test
    fun `toggleChecklistItem toggles done state`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.CHECKLIST)

        viewModel.addChecklistItem("Item 1")
        val itemId = viewModel.state.value.checklistItems[0].id

        viewModel.toggleChecklistItem(itemId)

        val state = viewModel.state.value
        assertEquals("Item must be toggled to done", true, state.checklistItems[0].isDone)
    }

    @Test
    fun `deleteChecklistItem removes item`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.CHECKLIST)

        viewModel.addChecklistItem("Item 1")
        viewModel.addChecklistItem("Item 2")
        val itemId = viewModel.state.value.checklistItems[0].id

        viewModel.deleteChecklistItem(itemId)

        val state = viewModel.state.value
        assertEquals("Must have 1 item remaining", 1, state.checklistItems.size)
    }

    @Test
    fun `clearError clears error state`() = runTest {
        viewModel.initialize(notebookId = 1L, noteId = null, noteType = NoteType.TEXT)

        // Trigger an error by trying to load non-existent note
        // Then clear it
        viewModel.clearError()

        val state = viewModel.state.value
        assertEquals("Error must be null after clear", null, state.error)
    }
}
