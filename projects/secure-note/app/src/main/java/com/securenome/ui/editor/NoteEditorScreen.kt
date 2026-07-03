package com.securenome.ui.editor

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.securenome.data.local.entity.NoteType
import java.io.File

/**
 * Note editor.
 *
 * Adapts the UI based on noteType:
 * - TEXT → OutlinedTextField for free text + photo capture/grid
 * - CHECKLIST → interactive checklist + photo capture/grid
 * - PHOTO (legacy) → text field + photo capture/grid
 *
 * Photos can be added to any note type — there's no standalone PHOTO type.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoteEditorScreen(
    notebookId: Long,
    noteId: Long?,
    onBack: () -> Unit,
    noteType: NoteType? = null,
    viewModel: NoteEditorViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    // Initialize ViewModel
    LaunchedEffect(notebookId, noteId) {
        viewModel.initialize(notebookId, noteId, noteType)
    }

    // Show errors in snackbar
    LaunchedEffect(state.error) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(noteId?.let { "Edit" } ?: "New note") },
                navigationIcon = {
                    IconButton(onClick = {
                        viewModel.saveOnBack()
                        onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        if (state.isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            when (state.noteType) {
                NoteType.TEXT -> TextEditor(
                    content = state.content,
                    onContentChange = { viewModel.onTextChanged(it) },
                    photos = state.photos,
                    onCapturePhoto = { uri -> viewModel.savePhoto(uri) },
                    onPickPhoto = { uri -> viewModel.savePhoto(uri) },
                    onDeletePhoto = { id -> viewModel.deletePhoto(id) },
                    modifier = Modifier.padding(padding)
                )
                NoteType.CHECKLIST -> ChecklistEditor(
                    items = state.checklistItems,
                    onAddItem = viewModel::addChecklistItem,
                    onToggleItem = viewModel::toggleChecklistItem,
                    onDeleteItem = viewModel::deleteChecklistItem,
                    photos = state.photos,
                    onCapturePhoto = { uri -> viewModel.savePhoto(uri) },
                    onPickPhoto = { uri -> viewModel.savePhoto(uri) },
                    onDeletePhoto = { id -> viewModel.deletePhoto(id) },
                    modifier = Modifier.padding(padding)
                )
                // Legacy PHOTO notes — show as text editor with photos
                NoteType.PHOTO -> TextEditor(
                    content = state.content,
                    onContentChange = { viewModel.onTextChanged(it) },
                    photos = state.photos,
                    onCapturePhoto = { uri -> viewModel.savePhoto(uri) },
                    onPickPhoto = { uri -> viewModel.savePhoto(uri) },
                    onDeletePhoto = { id -> viewModel.deletePhoto(id) },
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
private fun TextEditor(
    content: String,
    onContentChange: (String) -> Unit,
    photos: List<PhotoUi>,
    onCapturePhoto: (Uri) -> Unit,
    onPickPhoto: (Uri) -> Unit,
    onDeletePhoto: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        OutlinedTextField(
            value = content,
            onValueChange = onContentChange,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 200.dp),
            placeholder = { Text("Write your note...") },
            textStyle = MaterialTheme.typography.bodyLarge
        )

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(8.dp))

        PhotoSection(
            photos = photos,
            onCapturePhoto = onCapturePhoto,
            onPickPhoto = onPickPhoto,
            onDeletePhoto = onDeletePhoto
        )
    }
}

@Composable
private fun ChecklistEditor(
    items: List<ChecklistItemUi>,
    onAddItem: (String) -> Unit,
    onToggleItem: (Long) -> Unit,
    onDeleteItem: (Long) -> Unit,
    photos: List<PhotoUi>,
    onCapturePhoto: (Uri) -> Unit,
    onPickPhoto: (Uri) -> Unit,
    onDeletePhoto: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    var newItemText by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Add new item row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = newItemText,
                onValueChange = { newItemText = it },
                modifier = Modifier.weight(1f),
                singleLine = true,
                placeholder = { Text("Add item...") }
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = {
                    onAddItem(newItemText)
                    newItemText = ""
                },
                enabled = newItemText.isNotBlank()
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add")
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider()

        // Item list (non-lazy — small count fits in scrollable column)
        if (items.isEmpty()) {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "No items yet",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = item.isDone,
                            onCheckedChange = { onToggleItem(item.id) }
                        )
                        Text(
                            text = item.text,
                            style = MaterialTheme.typography.bodyLarge.copy(
                                textDecoration = if (item.isDone) TextDecoration.LineThrough
                                    else TextDecoration.None
                            ),
                            modifier = Modifier.weight(1f),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            color = if (item.isDone) MaterialTheme.colorScheme.onSurfaceVariant
                                else MaterialTheme.colorScheme.onSurface
                        )
                        IconButton(onClick = { onDeleteItem(item.id) }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Delete",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(8.dp))

        PhotoSection(
            photos = photos,
            onCapturePhoto = onCapturePhoto,
            onPickPhoto = onPickPhoto,
            onDeletePhoto = onDeletePhoto
        )
    }
}

/**
 * Photo capture buttons + thumbnail grid, meant to be embedded inside
 * other editors (text, checklist) so any note can have both content and photos.
 */
@Composable
private fun PhotoSection(
    photos: List<PhotoUi>,
    onCapturePhoto: (Uri) -> Unit,
    onPickPhoto: (Uri) -> Unit,
    onDeletePhoto: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    var currentPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var cameraPermissionDenied by remember { mutableStateOf(false) }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && currentPhotoUri != null) {
            onCapturePhoto(currentPhotoUri!!)
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            cameraPermissionDenied = false
            val file = File(
                context.filesDir,
                "photos/${System.currentTimeMillis()}.jpg"
            ).apply { parentFile?.mkdirs() }
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )
            currentPhotoUri = uri
            cameraLauncher.launch(uri)
        } else {
            cameraPermissionDenied = true
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { onPickPhoto(it) }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        // Action buttons
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = {
                    if (cameraPermissionDenied) return@OutlinedButton
                    val permission = Manifest.permission.CAMERA
                    if (ContextCompat.checkSelfPermission(context, permission) ==
                        PackageManager.PERMISSION_GRANTED
                    ) {
                        val file = File(
                            context.filesDir,
                            "photos/${System.currentTimeMillis()}.jpg"
                        ).apply { parentFile?.mkdirs() }
                        val uri = FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            file
                        )
                        currentPhotoUri = uri
                        cameraLauncher.launch(uri)
                    } else {
                        cameraPermissionLauncher.launch(permission)
                    }
                },
                enabled = !cameraPermissionDenied,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Camera")
            }
            Button(
                onClick = { galleryLauncher.launch("image/*") },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Gallery")
            }
        }

        if (cameraPermissionDenied) {
            Text(
                text = "Camera permission denied — enable it in Settings",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        // Photo grid (non-lazy to avoid nested scrolling issues)
        if (photos.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                photos.chunked(2).forEach { rowPhotos ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowPhotos.forEach { photo ->
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                            ) {
                                val bitmap = remember(photo.thumbnailBytes) {
                                    BitmapFactory.decodeByteArray(
                                        photo.thumbnailBytes,
                                        0,
                                        photo.thumbnailBytes.size
                                    )
                                }
                                if (bitmap != null) {
                                    androidx.compose.foundation.Image(
                                        bitmap = bitmap.asImageBitmap(),
                                        contentDescription = "Photo",
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop
                                    )
                                }
                                IconButton(
                                    onClick = { onDeletePhoto(photo.id) },
                                    modifier = Modifier.align(Alignment.TopEnd)
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Delete photo",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                        // Fill empty slot in the last row if odd count
                        if (rowPhotos.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}
