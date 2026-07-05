package com.securenome.ui.notebook

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.securenome.data.local.entity.NotebookEntity
import com.securenome.data.repository.NotebookRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Notebook list ViewModel.
 *
 * ## Why StateFlow instead of MutableStateFlow directly to UI?
 *
 * The UI should only ever see StateFlow (read-only).
 * MutableStateFlow is internal state — only the ViewModel can mutate it.
 *
 * ## Why stateIn?
 *
 * `stateIn` converts Flow<List<NotebookEntity>> → StateFlow<List<NotebookEntity>>.
 * StateFlow always has a value (initialValue) and Compose can react to it.
 *
 * ## Why WhileSubscribed(5000)?
 *
 * A 5-second "window" before closing the Flow. Prevents unnecessary
 * restarts during config changes (e.g. screen rotation).
 */
@HiltViewModel
class NotebookListViewModel @Inject constructor(
    private val notebookRepository: NotebookRepository
) : ViewModel() {

    /** All notebooks */
    val notebooks: StateFlow<List<NotebookEntity>> =
        notebookRepository.allNotebooks
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = emptyList()
            )

    /** Create new notebook */
    fun createNotebook(title: String) {
        viewModelScope.launch {
            val trimmed = title.trim().ifBlank { "New notebook" }
            notebookRepository.createNotebook(trimmed)
        }
    }

    /** Delete notebook */
    fun deleteNotebook(notebook: NotebookEntity) {
        viewModelScope.launch {
            notebookRepository.deleteNotebook(notebook)
        }
    }

    /**
     * Persist a new manual ordering of notebooks.
     * Called when the user finishes a drag-and-drop reorder.
     */
    fun reorderNotebooks(notebookIds: List<Long>) {
        viewModelScope.launch {
            notebookRepository.reorderNotebooks(notebookIds)
        }
    }
}
