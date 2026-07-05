package com.securenome.ui.notelist

import androidx.lifecycle.SavedStateHandle
import com.securenome.data.local.datastore.SettingsDataStore
import com.securenome.data.repository.NoteRepository
import com.securenome.data.share.ShareManager
import com.securenome.security.CryptoManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for NoteListViewModel.
 *
 * Tests search filtering, toggle share behavior,
 * and pending revocation queue.
 */
class NoteListViewModelTest {

    private val noteRepository: NoteRepository = mockk()
    private val cryptoManager: CryptoManager = mockk()
    private val shareManager: ShareManager = mockk()
    private val settingsDataStore: SettingsDataStore = mockk()
    private lateinit var viewModel: NoteListViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(StandardTestDispatcher())

        // Default mocks — all notes return empty by default
        every { settingsDataStore.sharingEnabled } returns MutableStateFlow(true)
        coEvery { settingsDataStore.getPendingRevocations() } returns emptyList()

        // Notebook ID 1
        val savedStateHandle = SavedStateHandle(mapOf("notebookId" to 1L))
        coEvery { noteRepository.getNotesByNotebook(1L) } returns flowOf(emptyList())

        viewModel = NoteListViewModel(
            savedStateHandle = savedStateHandle,
            noteRepository = noteRepository,
            cryptoManager = cryptoManager,
            shareManager = shareManager,
            settingsDataStore = settingsDataStore
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `searchQuery starts empty`() = runTest {
        val query = viewModel.searchQuery.first()
        assertEquals("Search query starts empty", "", query)
    }

    @Test
    fun `setSearchQuery updates search query`() = runTest {
        viewModel.setSearchQuery("hello")
        val query = viewModel.searchQuery.first()
        assertEquals("Search query must update", "hello", query)
    }

    @Test
    fun `toggleShare queues revocation on server failure`() = runTest {
        val noteId = 1L
        val shareCode = "A3F9-K2B1"

        // Mock: note exists, sharing enabled, server DELETE fails
        // (sharingEnabled is already mocked in setUp to return a MutableStateFlow(true))
        coEvery { shareManager.revokeShare(shareCode) } returns Result.failure(
            com.securenome.data.share.ShareApiException("Server down")
        )
        coEvery { settingsDataStore.addPendingRevocation(noteId, shareCode) } returns Unit
        coEvery { noteRepository.setShareCode(noteId, null) } returns Unit

        viewModel.toggleShare(noteId, shareCode)
        advanceUntilIdle()

        // The local code must be cleared and revocation queued
        coVerify { noteRepository.setShareCode(noteId, null) }
        coVerify { settingsDataStore.addPendingRevocation(noteId, shareCode) }
    }

    @Test
    fun `toggleShare clears code on successful revocation`() = runTest {
        val noteId = 1L
        val shareCode = "A3F9-K2B1"

        coEvery { shareManager.revokeShare(shareCode) } returns Result.success(Unit)
        coEvery { noteRepository.setShareCode(noteId, null) } returns Unit

        viewModel.toggleShare(noteId, shareCode)
        advanceUntilIdle()

        coVerify { noteRepository.setShareCode(noteId, null) }
        // Must NOT queue a pending revocation
        coVerify(exactly = 0) { settingsDataStore.addPendingRevocation(any(), any()) }
    }
}
