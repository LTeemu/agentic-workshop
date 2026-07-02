package com.securenome.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.securenome.data.local.entity.NoteType
import com.securenome.ui.editor.NoteEditorScreen
import com.securenome.ui.import.ImportScreen
import com.securenome.ui.notebook.NotebookListScreen
import com.securenome.ui.notelist.NoteListScreen
import com.securenome.ui.settings.SettingsScreen


/**
 * Navigation structure for the entire app.
 *
 * ## Why a separate NavGraph?
 *
 * All routes in one place — easier to understand the app's flow.
 * Navigation Compose handles screen transitions without Activity stacks.
 *
 * ## How does navArgument work?
 *
 * `navArgument("notebookId", type = NavType.LongType)` tells Navigation
 * that the notebookId route parameter is a Long. Without this, Navigation
 * cannot parse the parameter correctly.
 */
@Composable
fun NavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Route.NotebookList.route
    ) {
        // Notebook list (main view)
        composable(Route.NotebookList.route) {
            NotebookListScreen(
                onNotebookClick = { notebookId ->
                    navController.navigate(Route.NoteList.create(notebookId))
                },
                onSettingsClick = {
                    navController.navigate(Route.Settings.route)
                }
            )
        }

        // Note list in selected notebook
        composable(
            route = Route.NoteList.route,
            arguments = listOf(navArgument("notebookId") { type = NavType.LongType })
        ) { backStackEntry ->
            val notebookId = backStackEntry.arguments?.getLong("notebookId") ?: return@composable
            NoteListScreen(
                notebookId = notebookId,
                onNoteClick = { noteId ->
                    navController.navigate(Route.NoteEditor.create(notebookId, noteId))
                },
                onNewNote = { type ->
                    navController.navigate(Route.NoteEditor.create(notebookId, noteType = type.name))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // Note editor
        composable(
            route = Route.NoteEditor.route,
            arguments = listOf(
                navArgument("notebookId") { type = NavType.LongType },
                navArgument("noteId") {
                    type = NavType.LongType
                    defaultValue = -1L
                },
                navArgument("noteType") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val notebookId = backStackEntry.arguments?.getLong("notebookId") ?: return@composable
            val noteId = backStackEntry.arguments?.getLong("noteId") ?: -1L
            val noteTypeStr = backStackEntry.arguments?.getString("noteType")
            val noteType = noteTypeStr?.let { NoteType.valueOf(it) }
            NoteEditorScreen(
                notebookId = notebookId,
                noteId = noteId.takeIf { it != -1L },
                noteType = noteType,
                onBack = { navController.popBackStack() }
            )
        }

        // Import view
        composable(Route.Import.route) {
            ImportScreen(
                onImportComplete = { navController.popBackStack() }
            )
        }

        // Settings
        composable(Route.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
