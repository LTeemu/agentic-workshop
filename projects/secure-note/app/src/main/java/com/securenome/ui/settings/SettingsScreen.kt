package com.securenome.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

/**
 * Settings screen.
 *
 * ## Default: PIN lock is OFF.
 *
 * The user can enable it in settings. This is a
 * conscious design decision: the user decides their own security level.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val pinRequired by viewModel.pinRequired.collectAsStateWithLifecycle()
    val darkTheme by viewModel.darkTheme.collectAsStateWithLifecycle()
    val sharingEnabled by viewModel.sharingEnabled.collectAsStateWithLifecycle()

    // === PIN setup dialog state ===
    var showPinSetup by remember { mutableStateOf(false) }
    var pinEntry by remember { mutableStateOf("") }
    var pinConfirm by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf<String?>(null) }

    // === PIN disable confirmation state ===
    var showPinDisableConfirm by remember { mutableStateOf(false) }

    // PIN setup dialog
    if (showPinSetup) {
        AlertDialog(
            onDismissRequest = {
                showPinSetup = false
                pinEntry = ""
                pinConfirm = ""
                pinError = null
            },
            title = { Text("Set a PIN") },
            text = {
                Column {
                    Text(
                        text = "Choose a numeric PIN to lock the app.",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                    OutlinedTextField(
                        value = pinEntry,
                        onValueChange = {
                            if (it.all { c -> c.isDigit() }) pinEntry = it
                            pinError = null
                        },
                        label = { Text("Enter PIN") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.NumberPassword,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        isError = pinError != null,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = pinConfirm,
                        onValueChange = {
                            if (it.all { c -> c.isDigit() }) pinConfirm = it
                            pinError = null
                        },
                        label = { Text("Confirm PIN") },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.NumberPassword,
                            imeAction = ImeAction.Done
                        ),
                        singleLine = true,
                        isError = pinError != null,
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (pinError != null) {
                        Text(
                            text = pinError!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    when {
                        pinEntry.length < 4 -> pinError = "PIN must be at least 4 digits"
                        pinEntry != pinConfirm -> pinError = "PINs do not match"
                        else -> {
                            viewModel.enablePinLock(pinEntry)
                            showPinSetup = false
                            pinEntry = ""
                            pinConfirm = ""
                            pinError = null
                        }
                    }
                }) {
                    Text("Enable")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showPinSetup = false
                    pinEntry = ""
                    pinConfirm = ""
                    pinError = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    // PIN disable confirmation dialog
    if (showPinDisableConfirm) {
        AlertDialog(
            onDismissRequest = { showPinDisableConfirm = false },
            title = { Text("Disable PIN lock?") },
            text = { Text("The app will no longer require a PIN to open.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.disablePinLock()
                    showPinDisableConfirm = false
                }) {
                    Text("Disable")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPinDisableConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Security section
            Text(
                text = "Security",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(4.dp)) {
                    SettingRow(
                        icon = Icons.Default.Lock,
                        title = "PIN lock",
                        subtitle = "Require a PIN to open the app (default: off)",
                        checked = pinRequired,
                        onCheckedChange = { enabled ->
                            if (enabled) {
                                showPinSetup = true
                            } else {
                                showPinDisableConfirm = true
                            }
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Appearance section
            Text(
                text = "Appearance",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(4.dp)) {
                    SettingRow(
                        icon = Icons.Default.DarkMode,
                        title = "Dark theme",
                        subtitle = "Use dark color scheme",
                        checked = darkTheme,
                        onCheckedChange = { viewModel.toggleDarkTheme(it) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Sharing section
            Text(
                text = "Sharing",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(4.dp)) {
                    SettingRow(
                        icon = Icons.Default.Share,
                        title = "Sharing",
                        subtitle = "Master toggle — turn off to block\nall sharing and importing",
                        checked = sharingEnabled,
                        onCheckedChange = { viewModel.toggleSharing(it) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "About",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "SecureNote v1.0",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "AES-256-GCM encryption | Android Keystore",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean = true
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (enabled) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = if (enabled) MaterialTheme.colorScheme.onSurface
                    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = if (enabled) MaterialTheme.colorScheme.onSurfaceVariant
                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.38f)
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled
        )
    }
}
