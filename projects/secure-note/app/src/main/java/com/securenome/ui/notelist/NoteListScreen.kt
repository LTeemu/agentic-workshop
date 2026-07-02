package com.securenome.ui.notelist

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
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
import com.securenome.data.local.entity.NoteType
import com.securenome.ui.share.ShareDialog

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
    var showTypeMenu by remember { mutableStateOf(false) }

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
            onToggleShare = { id, code ->
                viewModel.toggleShare(id, code)
            },
            onDismiss = {
                shareDialogNoteId = null
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
                        text = { Text("Photo") },
                        onClick = { showTypeMenu = false; onNewNote(NoteType.PHOTO) },
                        leadingIcon = { Icon(Icons.Default.Photo, null) }
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
        if (notes.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
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
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(notes, key = { it.id }) { note ->
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
                        onDelete = { viewModel.deleteNote(note.id) }
                    )
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
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val icon = when (type) {
                NoteType.TEXT -> Icons.Default.Description
                NoteType.CHECKLIST -> Icons.Default.Checklist
                NoteType.PHOTO -> Icons.Default.Photo
            }
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when (type) {
                        NoteType.TEXT -> "Text"
                        NoteType.CHECKLIST -> "Checklist" + if (hasChecklist) " ✓" else ""
                        NoteType.PHOTO -> "Photo" + if (photoCount > 0) " ($photoCount)" else ""
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
