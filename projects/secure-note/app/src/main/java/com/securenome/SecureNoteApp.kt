package com.securenome

import android.app.Application
import com.securenome.security.AppLockManager
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * The app's [Application] class.
 *
 * @HiltAndroidApp starts Hilt's component hierarchy.
 * This is mandatory for Hilt usage — without it, @Inject and @HiltViewModel won't work.
 *
 * ## Why is AppLockManager injected here?
 *
 * AppLockManager needs to start when the app is created,
 * so it can begin observing ProcessLifecycleOwner. If it were started
 * only in MainActivity, the first background/foreground cycle would be missed.
 */
@HiltAndroidApp
class SecureNoteApp : Application() {

    @Inject
    lateinit var appLockManager: AppLockManager

    override fun onCreate() {
        super.onCreate()
        appLockManager.startObserving()
    }
}
