package com.securenome.ui.settings

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.securenome.ui.theme.SecureNoteTheme
import org.junit.Rule
import org.junit.Test

/**
 * UI tests for SettingsScreen.
 *
 * ## Why Compose testing?
 *
 * Jetpack Compose provides a testing framework that lets you
 * interact with composables programmatically — clicking buttons,
 * reading text, verifying state — without a full device.
 *
 * ## Why createComposeRule?
 *
 * The rule sets up a Compose environment for testing.
 * It handles composition, recomposition, and cleanup.
 */
class SettingsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `settings screen shows turvallisuus section`() {
        composeTestRule.setContent {
            SecureNoteTheme {
                SettingsScreen(onBack = {})
            }
        }

        composeTestRule.onNodeWithText("Turvallisuus")
            .assertExists("Security section title must be displayed")
    }

    @Test
    fun `settings screen shows biometric toggle`() {
        composeTestRule.setContent {
            SecureNoteTheme {
                SettingsScreen(onBack = {})
            }
        }

        composeTestRule.onNodeWithText("Biometrinen lukitus")
            .assertExists("Biometric lock toggle must exist")
    }
}
