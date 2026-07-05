package com.securenome.data.repository

import com.securenome.data.local.db.NotebookDao
import com.securenome.data.local.entity.NotebookEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for notebook operations.
 *
 * ## Why a repository layer?
 *
 * In Clean Architecture, the repository is the only place that talks to data sources
 * (here: Room). ViewModels never call the DAO directly.
 *
 * This enables:
 * 1. Changing the data source (e.g. Room -> web server) without ViewModel changes
 * 2. Testing: the repository can be mocked
 * 3. Centralizing caching and business logic
 */
@Singleton
class NotebookRepository @Inject constructor(
    private val notebookDao: NotebookDao
) {
    val allNotebooks: Flow<List<NotebookEntity>> = notebookDao.getAllNotebooks()

    suspend fun getNotebook(id: Long): NotebookEntity? = notebookDao.getNotebookById(id)

    suspend fun createNotebook(title: String): Long {
        val trimmed = title.trim()
        // Check for duplicate (case-insensitive after trim)
        val existing = notebookDao.getNotebookByTitle(trimmed)
        if (existing != null) return existing.id
        val nextSortOrder = notebookDao.getMaxSortOrder() + 1
        val notebook = NotebookEntity(title = trimmed, sortOrder = nextSortOrder)
        return notebookDao.insert(notebook)
    }

    suspend fun updateNotebook(notebook: NotebookEntity) = notebookDao.update(notebook)

    suspend fun deleteNotebook(notebook: NotebookEntity) = notebookDao.delete(notebook)

    /**
     * Reorder notebooks to match the given list of IDs.
     * Assigns sequential sortOrder values (0, 1, 2...) preserving the order of [notebookIds].
     */
    suspend fun reorderNotebooks(notebookIds: List<Long>) {
        notebookIds.forEachIndexed { index, id ->
            notebookDao.updateSortOrder(id, index)
        }
    }
}
