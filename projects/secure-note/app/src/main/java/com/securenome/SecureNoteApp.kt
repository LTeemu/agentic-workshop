package com.securenome

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * The app's [Application] class.
 *
 * @HiltAndroidApp starts Hilt's component hierarchy.
 * This is mandatory for Hilt usage — without it, @Inject and @HiltViewModel won't work.
 */
@HiltAndroidApp
class SecureNoteApp : Application()

