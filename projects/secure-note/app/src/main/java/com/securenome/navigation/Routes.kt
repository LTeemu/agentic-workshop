package com.securenome.navigation

/**
 * All app routes.
 *
 * ## Why sealed class?
 *
 * sealed class forces the compiler to check that all routes are handled
 * (in when expressions). Reduces navigation errors.
 *
 * ## Why create() functions?
 *
 * Parameterized routes (such as noteId) require a string with embedded
 * parameters. create() handles this in one place.
 */
sealed class Route(val route: String) {
    /** Notebook list — main view of the app */
    data object NotebookList : Route("notebooks")

    /** Note listing in a specific notebook */
    data object NoteList : Route("notebooks/{notebookId}") {
        fun create(notebookId: Long) = "notebooks/$notebookId"
    }

    /** Note editor (new or existing) */
    data object NoteEditor : Route("note/editor/{notebookId}?noteId={noteId}&noteType={noteType}") {
        fun create(notebookId: Long, noteId: Long? = null, noteType: String? = null) =
            "note/editor/$notebookId?noteId=${noteId ?: -1}${noteType?.let { "&noteType=$it" } ?: ""}"
    }

    /** Import note with share code */
    data object Import : Route("import")

    /** Settings */
    data object Settings : Route("settings")
}
