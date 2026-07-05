package com.securenome

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.navigation.compose.rememberNavController
import com.securenome.data.local.datastore.SettingsDataStore
import com.securenome.navigation.NavGraph
import com.securenome.security.AppLockManager
import com.securenome.ui.pinlock.PinEntryScreen
import com.securenome.ui.theme.SecureNoteTheme
import dagger.hilt.android.AndroidEntryPoint
import java.io.File
import java.security.KeyStore
import javax.inject.Inject

/**
 * The only Activity in the app.
 *
 * ## Why Single Activity?
 *
 * Modern Android architecture favors a single Activity with Navigation
 * Compose for screen management. This is lighter, faster, and
 * easier to manage than a multi-Activity approach.
 *
 * ## Why @AndroidEntryPoint?
 *
 * Hilt needs this annotation to inject dependencies into the Activity.
 * Without it, @Inject won't work.
 */
@AndroidEntryPoint
class MainActivity : FragmentActivity() {

    @Inject
    lateinit var settingsDataStore: SettingsDataStore

    @Inject
    lateinit var appLockManager: AppLockManager

    companion object {
        private const val KEYSTORE_ALIAS = "secure_note_key"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set up PIN lock lifecycle observer (one-shot, outside setContent).
        appLockManager.observe(lifecycle)

        enableEdgeToEdge()
        setContent {
            val darkThemePref by settingsDataStore.darkTheme.collectAsState(initial = false)
            val pinHash by settingsDataStore.pinHash.collectAsState(initial = null)
            val pinSalt by settingsDataStore.pinSalt.collectAsState(initial = null)
            val failedAttempts by settingsDataStore.pinFailedAttempts.collectAsState(initial = 0)
            val lockedUntil by settingsDataStore.pinLockedUntil.collectAsState(initial = 0L)
            val navController = rememberNavController()
            val scope = rememberCoroutineScope()

            // Show the lock screen immediately if PIN is configured
            // and the user hasn't authenticated in this process session.
            // Reading appLockManager.isAuthenticated at composition time
            // (inside remember) avoids the flash — it's correct on first
            // launch and survives rotation (Singleton survives Activity).
            var showLockScreen by remember {
                mutableStateOf(pinHash != null && !appLockManager.isAuthenticated)
            }

            // Lifecycle-driven lock trigger (background timer expiration).
            remember {
                appLockManager.onLockRequired = {
                    showLockScreen = true
                }
            }

            CompositionLocalProvider(LocalLifecycleOwner provides this@MainActivity) {
                // key() forces a fresh composition when darkThemePref changes.
                // This prevents Material 3's built-in color scheme animation
                // (a slow crossfade between light and dark).
                key(darkThemePref) {
                    SecureNoteTheme(
                        darkTheme = if (darkThemePref) true else isSystemInDarkTheme(),
                        dynamicColor = true
                    ) {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = MaterialTheme.colorScheme.background
                        ) {
                            if (showLockScreen) {
                                PinEntryScreen(
                                    pinHash = pinHash,
                                    pinSalt = pinSalt,
                                    failedAttempts = failedAttempts,
                                    lockedUntil = lockedUntil,
                                    onUnlocked = {
                                        showLockScreen = false
                                        appLockManager.unlock()
                                    },
                                    onFailedAttempt = {
                                        scope.launch {
                                            settingsDataStore.incrementFailedAttempts()
                                        }
                                    },
                                    onResetAttempts = {
                                        scope.launch {
                                            settingsDataStore.resetFailedAttempts()
                                        }
                                    },
                                    onSetLocked = { timestamp ->
                                        scope.launch {
                                            settingsDataStore.setLockedUntil(timestamp)
                                        }
                                    },
                                    onForgotPin = {
                                        scope.launch {
                                            wipeAllData()
                                        }
                                    }
                                )
                            } else {
                                NavGraph(navController = navController)
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Wipe all local data and restart the app fresh.
     *
     * This is a last-resort recovery for forgotten PINs.
     * Order matters to avoid breaking active observers:
     * 1. Clear DataStore first (goes through proper channel — Flow subscribers
     *    see empty state instead of crashing on a missing file)
     * 2. Delete Keystore key (no live references to it)
     * 3. Delete Room database (Context closes it first)
     * 4. Delete app files (photos, shares, etc.)
     * 5. Restart activity fresh
     *
     * Pending revocations on the share server are left orphaned.
     * They expire after 24h via server-side TTL — no network call needed.
     */
    private suspend fun wipeAllData() = withContext(Dispatchers.IO) {
        // 1. Clear DataStore properly through its transactional channel.
        //    This must go first so any active collectAsState subscribers
        //    (the lock screen) transition to empty state gracefully.
        settingsDataStore.clearAll()

        // 2. Delete the Keystore key so encrypted data is unrecoverable
        try {
            val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            keyStore.deleteEntry(KEYSTORE_ALIAS)
        } catch (_: Exception) { /* key may not exist */ }

        // 3. Delete Room database (Context API handles closing it)
        applicationContext.deleteDatabase("secure_note.db")

        // 4. Delete app files (photos, shares, .securenome exports)
        applicationContext.filesDir.listFiles()?.forEach { file ->
            file.deleteRecursively()
        }

        // 5. Restart the activity to re-initialize with empty state
        withContext(Dispatchers.Main) {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            intent?.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
            finish()
        }
    }
}