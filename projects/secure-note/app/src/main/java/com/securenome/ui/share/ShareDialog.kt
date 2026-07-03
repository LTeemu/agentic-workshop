package com.securenome.ui.share

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.OfflineBolt
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * Dialog for managing a note's share status.
 *
 * Shows the share code (if sharing is on) with a toggle to turn
 * sharing on/off. When toggled on, a share code is created.
 * When toggled off, the share code is revoked.
 */
@Composable
fun ShareDialog(
    noteId: Long,
    currentShareCode: String?,
    isServerReachable: Boolean,
    sharingEnabled: Boolean,
    onToggleShare: (noteId: Long, currentShareCode: String?) -> Unit,
    onDismiss: () -> Unit
) {
    val clipboardManager = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Share note")
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Server status indicator
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = if (isServerReachable) Icons.Default.Cloud
                            else Icons.Default.OfflineBolt,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (isServerReachable) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isServerReachable) "Online sharing"
                            else "Offline sharing (file)",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Disabled warning
                if (!sharingEnabled) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp)
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

                Spacer(modifier = Modifier.height(20.dp))

                // Share toggle
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Share on",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Switch(
                        checked = currentShareCode != null,
                        onCheckedChange = { enabled ->
                            if (!isLoading && sharingEnabled) {
                                isLoading = true
                                scope.launch {
                                    onToggleShare(noteId, if (enabled) null else currentShareCode)
                                    isLoading = false
                                }
                            }
                        },
                        enabled = sharingEnabled,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.primary,
                            checkedTrackColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Share code display
                if (currentShareCode != null) {
                    OutlinedCard(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = currentShareCode,
                            style = MaterialTheme.typography.headlineLarge.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Copy button
                    TextButton(
                        onClick = {
                            clipboardManager.setText(AnnotatedString(currentShareCode))
                        },
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Copy")
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Recipient enters this code\nin the Import screen",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    Text(
                        text = "Not shared",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (isLoading) {
                        Spacer(modifier = Modifier.height(12.dp))
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
