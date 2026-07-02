package com.securenome.ui.notelist

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.securenome.ui.theme.SecureNoteTheme
import org.junit.Rule
import org.junit.Test

/**
 * UI tests for NoteListScreen.
 */
class NoteListScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `note list shows empty state when no notes`() {
        composeTestRule.setContent {
            SecureNoteTheme {
                NoteListScreen(
                    notebookId = 1L,
                    onNoteClick = {},
                    onNewNote = {},
                    onBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText("No notes")
            .assertIsDisplayed()
    }

    @Test
    fun `note list shows text option in menu`() {
        composeTestRule.setContent {
            SecureNoteTheme {
                NoteListScreen(
                    notebookId = 1L,
                    onNoteClick = {},
                    onNewNote = {},
                    onBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Text")
            .assertExists("Text option must exist in dropdown menu")
    }
}
