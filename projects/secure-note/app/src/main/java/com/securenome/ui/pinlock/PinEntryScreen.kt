package com.securenome.ui.pinlock

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * Full-screen PIN lock overlay shown on cold start or background return.
 *
 * Uses PBKDF2WithHmacSHA256 with a random salt for PIN verification,
 * and enforces escalating lockout delays after repeated failures.
 *
 * @param pinHash stored PBKDF2 hash (hex string), null if not set
 * @param pinSalt stored PBKDF2 salt (hex string), null if not set
 * @param failedAttempts number of consecutive failed PIN attempts
 * @param lockedUntil timestamp (millis) until lockout expires, 0 = not locked
 * @param onUnlocked called when the correct PIN is entered
 * @param onFailedAttempt called to increment the failure counter
 * @param onResetAttempts called to clear failure counter on successful unlock
 * @param onSetLocked called with a timestamp to lock the PIN screen
 * @param onForgotPin called when the user chooses to wipe all data and start fresh
 * @param currentTimeMillis time provider (defaults to System.currentTimeMillis, overridable for testing)
 */
@Composable
fun PinEntryScreen(
    pinHash: String?,
    pinSalt: String?,
    failedAttempts: Int,
    lockedUntil: Long,
    onUnlocked: () -> Unit,
    onFailedAttempt: () -> Unit,
    onResetAttempts: () -> Unit,
    onSetLocked: (Long) -> Unit,
    onForgotPin: () -> Unit,
    currentTimeMillis: () -> Long = { System.currentTimeMillis() }
) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var lockoutMessage by remember { mutableStateOf<String?>(null) }
    var showForgotDialog by remember { mutableStateOf(false) }

    // Forgot PIN confirmation dialog
    if (showForgotDialog) {
        AlertDialog(
            onDismissRequest = { showForgotDialog = false },
            title = { Text("Reset all data?") },
            text = {
                Text(
                    "This will delete all your notes, notebooks, photos, " +
                    "and the PIN. The app will reset to its initial state. " +
                    "This cannot be undone."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showForgotDialog = false
                    onForgotPin()
                }) {
                    Text("Reset", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showForgotDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Check lockout state
    val now = currentTimeMillis()
    val isLocked = lockedUntil > now
    val lockoutRemaining = if (isLocked) (lockedUntil - now) / 1000 else 0L

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "SecureNote is locked",
            style = MaterialTheme.typography.headlineSmall
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Enter your PIN to unlock",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = pin,
            onValueChange = {
                if (it.all { c -> c.isDigit() }) {
                    pin = it
                    error = null
                }
            },
            label = { Text("PIN") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.NumberPassword,
                imeAction = ImeAction.Done
            ),
            singleLine = true,
            isError = error != null,
            enabled = !isLocked,
            modifier = Modifier.fillMaxWidth()
        )

        if (error != null) {
            Text(
                text = error!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        if (lockoutMessage != null) {
            Text(
                text = lockoutMessage!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(
            onClick = {
                if (isLocked) return@TextButton
                if (pin.isEmpty()) {
                    error = "Enter your PIN"
                    return@TextButton
                }
                if (pinHash == null || pinSalt == null) {
                    error = "PIN not configured"
                    return@TextButton
                }

                // Verify with PBKDF2
                val isValid = verifyPin(pin, pinSalt) == pinHash
                if (isValid) {
                    onResetAttempts()
                    onUnlocked()
                } else {
                    val attempts = failedAttempts + 1
                    onFailedAttempt()
                    error = "Incorrect PIN"
                    pin = ""

                    // Escalating lockout: 5→30s, 10→5min, 15→permanent
                    when {
                        attempts >= 15 -> {
                            // Permanent lock (24h — effectively permanent without app data reset)
                            val lockUntil = currentTimeMillis() + 24 * 60 * 60 * 1000L
                            onSetLocked(lockUntil)
                            lockoutMessage = "Too many attempts. PIN locked for 24 hours."
                        }
                        attempts >= 10 -> {
                            val lockUntil = currentTimeMillis() + 5 * 60 * 1000L
                            onSetLocked(lockUntil)
                            lockoutMessage = "Too many attempts. PIN locked for 5 minutes."
                        }
                        attempts >= 5 -> {
                            val lockUntil = currentTimeMillis() + 30 * 1000L
                            onSetLocked(lockUntil)
                            lockoutMessage = "Too many attempts. PIN locked for 30 seconds."
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isLocked
        ) {
            Text("Unlock", style = MaterialTheme.typography.titleMedium)
        }

        // Show lockout countdown if locked
        if (isLocked && lockoutRemaining > 0) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Locked. Try again in ${lockoutRemaining}s",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Forgot PIN option — always visible but styled as subtle hint text
        TextButton(
            onClick = { showForgotDialog = true },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Forgot PIN?",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }
    }
}

/** Hash a PIN with PBKDF2WithHmacSHA256 using the given hex-encoded salt. */
private fun verifyPin(pin: String, saltHex: String): String {
    val salt = saltHex.decodeHex()
    val spec = PBEKeySpec(pin.toCharArray(), salt, 100_000, 256)
    val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
    return factory.generateSecret(spec).encoded.joinToString("") { "%02x".format(it) }
}

/** Decode a hex string to ByteArray. */
private fun String.decodeHex(): ByteArray {
    val hex = this
    require(hex.length % 2 == 0) { "Hex string must have even length" }
    return ByteArray(hex.length / 2) {
        (((hex[it * 2].digitToIntOrNull(16) ?: 0) shl 4) or
            (hex[it * 2 + 1].digitToIntOrNull(16) ?: 0)).toByte()
    }
}
