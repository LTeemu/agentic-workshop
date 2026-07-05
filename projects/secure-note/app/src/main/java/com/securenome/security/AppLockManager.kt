package com.securenome.security

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.securenome.data.local.datastore.SettingsDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages automatic app locking via PIN.
 *
 * ## How does this work?
 *
 * Observes the Activity lifecycle directly. On `ON_STOP` (background, camera
 * intent, or config change) a [LOCK_GRACE_MS] timer starts. If the user
 * returns before the timer expires, the authenticated flag is preserved and
 * no PIN is required. If the timer expires, the flag is cleared and the
 * next `ON_RESUME` will show the PIN screen.
 *
 * This avoids locking the app when the camera or gallery intent is launched
 * (brief backgrounding), while still securing the app when the user truly
 * switches to another app.
 *
 * ## Grace period notes:
 *
 * - Camera/gallery intents typically return in < 1s → grace period keeps auth
 * - Config change (rotation) is instant → grace period keeps auth
 * - True background switching (home button, recent apps) → 5s grace then lock
 * - Cold start: `authenticated` starts false → PIN on first resume
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
    companion object {
        /** How long the app can be in background before locking. */
        private const val LOCK_GRACE_MS = 5_000L
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** Has the user authenticated in this process session? */
    private var authenticated: Boolean = false

    /** Job that clears [authenticated] after the grace period. */
    private var lockTimer: Job? = null

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
                        // Start grace timer — lock only if user stays away
                        lockTimer?.cancel()
                        lockTimer = scope.launch {
                            if (settingsDataStore.pinRequired.first()) {
                                delay(LOCK_GRACE_MS)
                                authenticated = false
                            }
                        }
                    }
                    Lifecycle.Event.ON_RESUME -> {
                        // Cancel grace timer — user is back
                        lockTimer?.cancel()
                        lockTimer = null
                        // If the timer already fired, authenticated is false → show PIN
                        // If user returned quickly, authenticated is still true → no PIN
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
