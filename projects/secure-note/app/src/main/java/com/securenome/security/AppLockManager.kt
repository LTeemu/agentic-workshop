package com.securenome.security

import android.app.Application
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.securenome.data.local.datastore.SettingsDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages automatic app locking.
 *
 * ## How does this work?
 *
 * 1. Registers with ProcessLifecycleOwner to listen for lifecycle events
 * 2. When the app goes to background (onStop), sets `isLocked = true`
 * 3. When the app returns to foreground (onStart), checks:
 *    - Is biometric lock enabled in settings?
 *    - If yes → show BiometricPrompt
 *    - If no → open directly
 *
 * ## Why ProcessLifecycleOwner instead of Activity lifecycle?
 *
 * ProcessLifecycleOwner tracks the entire app process, not a single
 * Activity. This works correctly even when the user switches
 * to another app (not just another Activity).
 *
 * ## Default: lock is OFF.
 *
 * The user enables it in settings (SettingsScreen).
 *
 * @see SettingsDataStore.biometricRequired
 */
@Singleton
class AppLockManager @Inject constructor(
    @ApplicationContext private val context: android.content.Context,
    private val settingsDataStore: SettingsDataStore,
    private val biometricAuth: BiometricAuth
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** Is the app currently locked? */
    @Volatile
    var isLocked: Boolean = false
        private set

    /** Callback set by UI: what to do when lock is required */
    var onLockRequired: (() -> Unit)? = null

    /** Callback set by UI: what to do when lock is removed */
    var onUnlocked: (() -> Unit)? = null

    /**
     * Start lifecycle observation.
     * Call this in Application.onCreate() or MainActivity.onCreate().
     */
    fun startObserving() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(
            LifecycleEventObserver { source: LifecycleOwner, event: Lifecycle.Event ->
                when (event) {
                    Lifecycle.Event.ON_STOP -> {
                        // App went to background
                        scope.launch {
                            val biometricEnabled = settingsDataStore.biometricRequired.first()
                            if (biometricEnabled) {
                                isLocked = true
                            }
                        }
                    }
                    Lifecycle.Event.ON_START -> {
                        // App returned to foreground
                        scope.launch {
                            val biometricEnabled = settingsDataStore.biometricRequired.first()
                            if (biometricEnabled && isLocked) {
                                onLockRequired?.invoke()
                            }
                        }
                    }
                    else -> { /* not handled */ }
                }
            }
        )
    }

    /** Mark the app as unlocked after successful authentication */
    fun unlock() {
        isLocked = false
        onUnlocked?.invoke()
    }
}
