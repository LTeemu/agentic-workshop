package com.securenome.security

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.securenome.data.local.datastore.SettingsDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages automatic app locking via PIN.
 *
 * ## How does this work?
 *
 * Observes the Activity lifecycle directly. On every `ON_STOP` (background
 * or config change) the `authenticated` flag is cleared. On every `ON_RESUME`,
 * if PIN lock is enabled and the user hasn't authenticated yet in this
 * session, the PinEntryScreen should be shown.
 *
 * This means:
 * - **Cold start**: `authenticated` starts false → prompt on first resume
 * - **Background return**: `ON_STOP` clears flag → prompt on next resume
 * - **Config change**: `ON_STOP` clears flag → prompt shows again (acceptable)
 *
 * ## Default: lock is OFF.
 *
 * The user enables it in settings (SettingsScreen).
 *
 * @see SettingsDataStore.pinRequired
 */
@Singleton
class AppLockManager @Inject constructor(
    private val settingsDataStore: SettingsDataStore
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** Has the user authenticated in this process session? */
    private var authenticated: Boolean = false

    /** Callback set by UI: what to do when lock is required */
    var onLockRequired: (() -> Unit)? = null

    /**
     * Observe an Activity's lifecycle for lock/unlock events.
     * Call this from the Activity's onCreate().
     */
    fun observe(lifecycle: Lifecycle) {
        lifecycle.addObserver(
            LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_STOP -> {
                        scope.launch {
                            if (settingsDataStore.pinRequired.first()) {
                                authenticated = false
                            }
                        }
                    }
                    Lifecycle.Event.ON_RESUME -> {
                        scope.launch {
                            if (!authenticated && settingsDataStore.pinRequired.first()) {
                                onLockRequired?.invoke()
                            }
                        }
                    }
                    else -> { /* not handled */ }
                }
            }
        )
    }

    /** Mark the app as unlocked after successful PIN entry */
    fun unlock() {
        authenticated = true
    }
}
