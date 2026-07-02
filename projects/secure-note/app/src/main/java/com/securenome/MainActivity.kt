package com.securenome

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.navigation.compose.rememberNavController
import com.securenome.navigation.NavGraph
import com.securenome.ui.theme.SecureNoteTheme
import dagger.hilt.android.AndroidEntryPoint

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
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CompositionLocalProvider(LocalLifecycleOwner provides this@MainActivity) {
                SecureNoteTheme(dynamicColor = true) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        val navController = rememberNavController()
                        NavGraph(navController = navController)
                    }
                }
            }
        }
    }
}
