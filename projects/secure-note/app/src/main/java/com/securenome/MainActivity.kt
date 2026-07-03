package com.securenome

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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.navigation.compose.rememberNavController
import com.securenome.data.local.datastore.SettingsDataStore
import com.securenome.navigation.NavGraph
import com.securenome.security.AppLockManager
import com.securenome.ui.pinlock.PinEntryScreen
import com.securenome.ui.theme.SecureNoteTheme
import dagger.hilt.android.AndroidEntryPoint
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set up PIN lock lifecycle observer (one-shot, outside setContent).
        appLockManager.observe(lifecycle)

        enableEdgeToEdge()
        setContent {
            val darkThemePref by settingsDataStore.darkTheme.collectAsState(initial = false)
            val pinHash by settingsDataStore.pinHash.collectAsState(initial = null)
            val navController = rememberNavController()

            // Track whether the lock screen should be visible.
            var showLockScreen by remember { mutableStateOf(false) }

            // Set the callback once — it updates the composable state.
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
                                    onUnlocked = {
                                        showLockScreen = false
                                        appLockManager.unlock()
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
}
