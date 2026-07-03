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
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import java.security.MessageDigest

/**
 * Full-screen PIN lock overlay shown on cold start or background return.
 *
 * Hashes the entered PIN with SHA-256 and compares against the stored hash.
 * On success calls [onUnlocked]. On failure shows an error message.
 *
 * @param pinHash stored SHA-256 hash (hex string), null if not set
 * @param onUnlocked called when the correct PIN is entered
 */
@Composable
fun PinEntryScreen(
    pinHash: String?,
    onUnlocked: () -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

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

        Spacer(modifier = Modifier.height(16.dp))

        TextButton(
            onClick = {
                if (pin.isEmpty()) {
                    error = "Enter your PIN"
                    return@TextButton
                }
                val digest = MessageDigest.getInstance("SHA-256")
                val hash = digest.digest(pin.toByteArray())
                    .joinToString("") { "%02x".format(it) }
                if (hash == pinHash) {
                    onUnlocked()
                } else {
                    error = "Incorrect PIN"
                    pin = ""
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Unlock", style = MaterialTheme.typography.titleMedium)
        }
    }
}
