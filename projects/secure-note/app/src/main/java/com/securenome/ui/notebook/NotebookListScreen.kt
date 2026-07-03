package com.securenome.ui.notebook

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.securenome.data.local.entity.NotebookEntity
import com.securenome.ui.common.AddDialog
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyListState

/**
 * Notebook list main screen.
 *
 * ## Why Scaffold + TopAppBar?
 *
 * Scaffold is Material 3's standard structure, which manages:
 * - Top bar (TopAppBar)
 * - FAB button
 * - Content area
 * - Bottom bar — not used here
 *
 * ## Why collectAsStateWithLifecycle?
 *
 * lifecycle-aware version of collectAsState. Pauses collection
 * when the composable is not visible (e.g. another screen on top).
 * Saves resources.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotebookListScreen(
    onNotebookClick: (Long) -> Unit,
    onSettingsClick: () -> Unit,
    viewModel: NotebookListViewModel = hiltViewModel()
) {
    val notebooks by viewModel.notebooks.collectAsStateWithLifecycle()

    // Local mutable snapshot used by the reorderable library.
    // Synced from the ViewModel flow when no drag is active.
    var isDragging by remember { mutableStateOf(false) }
    var reorderableNotebooks by remember { mutableStateOf(notebooks) }
    LaunchedEffect(notebooks) {
        if (!isDragging) reorderableNotebooks = notebooks
    }

    val lazyListState = rememberLazyListState()
    val reorderableState = rememberReorderableLazyListState(lazyListState) { from, to ->
        reorderableNotebooks = reorderableNotebooks.toMutableList().apply {
            add(to.index, removeAt(from.index))
        }
    }

    // Dialog for creating a new notebook
    var showNewDialog by remember { mutableStateOf(false) }
    var notebookToDelete by remember { mutableStateOf<NotebookEntity?>(null) }

    // Delete confirmation dialog
    notebookToDelete?.let { notebook ->
        AlertDialog(
            onDismissRequest = { notebookToDelete = null },
            title = { Text("Delete \"${notebook.title}\"?") },
            text = { Text("All notes in this notebook will be deleted. This cannot be undone.") },
            confirmButton = {
                Button(onClick = {
                    viewModel.deleteNotebook(notebook)
                    notebookToDelete = null
                }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { notebookToDelete = null }) { Text("Cancel") }
            }
        )
    }

    if (showNewDialog) {
        AddDialog(
            title = "New notebook",
            hint = "Notebook name",
            onConfirm = { name ->
                viewModel.createNotebook(name)
                showNewDialog = false
            },
            onDismiss = { showNewDialog = false }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SecureNote") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                actions = {
                    IconButton(onClick = onSettingsClick) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showNewDialog = true },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "New notebook")
            }
        }
    ) { padding ->
        if (reorderableNotebooks.isEmpty()) {
            EmptyNotebooksPlaceholder(modifier = Modifier.padding(padding))
        } else {
            LazyColumn(
                state = lazyListState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(reorderableNotebooks, key = { it.id }) { notebook ->
                    ReorderableItem(reorderableState, key = notebook.id) { isItemDragging ->
                        val reorderScope = this
                        NotebookCard(
                            notebook = notebook,
                            onClick = { onNotebookClick(notebook.id) },
                            onDelete = { notebookToDelete = notebook },
                            isDragging = isItemDragging,
                            dragHandle = {
                                with(reorderScope) {
                                    IconButton(
                                        onClick = {},
                                        modifier = Modifier.longPressDraggableHandle(
                                            onDragStarted = { isDragging = true },
                                            onDragStopped = {
                                                isDragging = false
                                                viewModel.reorderNotebooks(
                                                    reorderableNotebooks.map { it.id }
                                                )
                                            },
                                        )
                                    ) {
                                        Icon(
                                            Icons.Default.DragHandle,
                                            contentDescription = "Drag to reorder",
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                        )
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NotebookCard(
    notebook: NotebookEntity,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
    isDragging: Boolean = false,
    dragHandle: @Composable (() -> Unit)? = null
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isDragging) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isDragging) 8.dp else 0.dp
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 4.dp, end = 16.dp, top = 16.dp, bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Drag handle (shown on long-press, signals reorderability)
            if (dragHandle != null) {
                dragHandle()
            }

            Icon(
                imageVector = Icons.Default.Folder,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.padding(start = 12.dp))
            Text(
                text = notebook.title,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun EmptyNotebooksPlaceholder(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "No notebooks",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Create one with the + button",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
