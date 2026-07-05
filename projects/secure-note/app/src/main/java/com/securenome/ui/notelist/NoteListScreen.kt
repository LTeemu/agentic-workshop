package com.securenome.ui.notelist

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.securenome.data.local.entity.NoteType
import com.securenome.ui.share.ShareDialog
import kotlinx.coroutines.launch
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyListState

/**
 * Shows all notes in a specific notebook.
 *
 * ## Why "type + content" cards?
 *
 * Different note types (text, checklist, photo) are shown
 * with different icons, so the user can quickly identify the type.
 *
 * ## Why is ViewModel called with hiltViewModel()?
 *
 * Hilt creates and manages the ViewModel lifecycle automatically.
 * The ViewModel persists across config changes (e.g. screen rotation).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteListScreen(
    notebookId: Long,
    onNoteClick: (Long) -> Unit,
    onNewNote: (NoteType) -> Unit,
    onBack: () -> Unit,
    viewModel: NoteListViewModel = hiltViewModel()
) {
    val notes by viewModel.noteSummaries.collectAsStateWithLifecycle()
    val sharingEnabled by viewModel.sharingEnabled.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()

    // Local mutable snapshot of notes used by the reorderable library.
    // Synced from the ViewModel flow when no drag is active.
    var isDragging by remember { mutableStateOf(false) }
    var reorderableNotes by remember { mutableStateOf(notes) }
    LaunchedEffect(notes) {
        if (!isDragging) reorderableNotes = notes
    }

    val lazyListState = rememberLazyListState()
    val reorderableState = rememberReorderableLazyListState(lazyListState) { from, to ->
        reorderableNotes = reorderableNotes.toMutableList().apply {
            add(to.index, removeAt(from.index))
        }
    }

    var showTypeMenu by remember { mutableStateOf(false) }
    var showImportDialog by remember { mutableStateOf(false) }
    var noteToDelete by remember { mutableStateOf<Long?>(null) }
    var importCode by remember { mutableStateOf("") }
    var isImporting by remember { mutableStateOf(false) }
    var importError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Share dialog state
    var shareDialogNoteId by remember { mutableStateOf<Long?>(null) }
    // Derive the code directly from the reactive notes list so the dialog
    // and card icon update immediately after a toggle.
    val shareDialogCode = shareDialogNoteId?.let { id ->
        notes.find { it.id == id }?.shareCode
    }
    var shareDialogServerReachable by remember { mutableStateOf(false) }

    // Show share dialog when a note's share button is tapped
    shareDialogNoteId?.let { noteId ->
        ShareDialog(
            noteId = noteId,
            currentShareCode = shareDialogCode,
            isServerReachable = shareDialogServerReachable,
            sharingEnabled = sharingEnabled,
            onToggleShare = { id, code ->
                viewModel.toggleShare(id, code)
            },
            onDismiss = {
                shareDialogNoteId = null
            }
        )
    }

    // Delete confirmation dialog
    noteToDelete?.let { id ->
        AlertDialog(
            onDismissRequest = { noteToDelete = null },
            title = { Text("Delete note?") },
            text = { Text("This cannot be undone.") },
            confirmButton = {
                Button(onClick = {
                    viewModel.deleteNote(id)
                    noteToDelete = null
                }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { noteToDelete = null }) { Text("Cancel") }
            }
        )
    }

    // Import dialog
    if (showImportDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isImporting) {
                    showImportDialog = false
                    importCode = ""
                    importError = null
                }
            },
            title = { Text("Import note") },
            text = {
                Column {
                    if (!sharingEnabled) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Sharing is disabled in Settings",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    Text(
                        text = "Enter the share code",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = importCode,
                        onValueChange = { importCode = it.uppercase().take(20) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("e.g. A3F9-K2B1") },
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        enabled = !isImporting && sharingEnabled
                    )
                    if (importError != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = importError!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            },
            confirmButton = {
                    Button(
                        onClick = {
                            val valid = importCode.matches(Regex("^[A-Z0-9]{4}-[A-Z0-9]{4}$"))
                            if (!valid) {
                                importError = "Enter a valid code (e.g. A3F9-K2B1)"
                                return@Button
                            }
                        isImporting = true
                        importError = null
                        scope.launch {
                            try {
                                viewModel.importNote(notebookId, importCode)
                                showImportDialog = false
                                importCode = ""
                            } catch (e: Exception) {
                                importError = e.message ?: "Import failed"
                            } finally {
                                isImporting = false
                            }
                        }
                    },
                    enabled = importCode.length >= 8 && !isImporting && sharingEnabled
                ) {
                    if (isImporting) {
                        CircularProgressIndicator(
                            modifier = Modifier.height(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Import")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showImportDialog = false
                        importCode = ""
                        importError = null
                    },
                    enabled = !isImporting
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notes") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            Column(horizontalAlignment = Alignment.End) {
                DropdownMenu(
                    expanded = showTypeMenu,
                    onDismissRequest = { showTypeMenu = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("Text") },
                        onClick = { showTypeMenu = false; onNewNote(NoteType.TEXT) },
                        leadingIcon = { Icon(Icons.Default.Description, null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Checklist") },
                        onClick = { showTypeMenu = false; onNewNote(NoteType.CHECKLIST) },
                        leadingIcon = { Icon(Icons.Default.Checklist, null) }
                    )
                    DropdownMenuItem(
                        text = { Text("Import") },
                        onClick = { showTypeMenu = false; showImportDialog = true },
                        leadingIcon = { Icon(Icons.Default.Cloud, null) }
                    )
                }
                FloatingActionButton(
                    onClick = { showTypeMenu = true },
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "New note")
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = viewModel::setSearchQuery,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search notes...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
            ) {
            if (reorderableNotes.isEmpty()) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "No notes",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Create one with the + button",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    state = lazyListState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(reorderableNotes, key = { it.id }) { note ->
                        ReorderableItem(reorderableState, key = note.id) { isItemDragging ->
                            val reorderScope = this
                            NoteCard(
                                type = note.type,
                                preview = note.preview,
                                hasChecklist = note.hasChecklist,
                                photoCount = note.photoCount,
                                shareCode = note.shareCode,
                                onClick = { onNoteClick(note.id) },
                                onShare = {
                                    shareDialogNoteId = note.id
                                    shareDialogServerReachable = false
                                },
                                onDelete = { noteToDelete = note.id },
                                isDragging = isItemDragging,
                                dragHandle = {
                                    with(reorderScope) {
                                        IconButton(
                                            onClick = {},
                                            modifier = Modifier.longPressDraggableHandle(
                                                onDragStarted = { isDragging = true },
                                                onDragStopped = {
                                                    isDragging = false
                                                    viewModel.reorderNotes(
                                                        reorderableNotes.map { it.id }
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
    }
}

@Composable
private fun NoteCard(
    type: NoteType,
    preview: String,
    hasChecklist: Boolean,
    photoCount: Int,
    shareCode: String?,
    onClick: () -> Unit,
    onShare: () -> Unit,
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

            val icon = when (type) {
                NoteType.TEXT, NoteType.PHOTO -> Icons.Default.Description
                NoteType.CHECKLIST -> Icons.Default.Checklist
            }
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                val photoSuffix = if (photoCount > 0) " ($photoCount)" else ""
                Text(
                    text = when (type) {
                        NoteType.TEXT, NoteType.PHOTO -> "Text$photoSuffix"
                        NoteType.CHECKLIST -> "Checklist" + (if (hasChecklist) " ✓" else "") + photoSuffix
                    },
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = preview.ifBlank { "(empty)" },
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.error
                )
            }
            IconButton(onClick = onShare) {
                Icon(
                    Icons.Default.Share,
                    contentDescription = if (shareCode != null) "Shared" else "Share",
                    tint = if (shareCode != null) MaterialTheme.colorScheme.primaryContainer
                    else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
