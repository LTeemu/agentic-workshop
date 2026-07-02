package com.securenome.security

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricPrompt.PromptInfo
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages biometric authentication.
 *
 * ## Why a separate class?
 *
 * Biometric authentication is a complex API with
 * several edge cases (no biometrics, no fingerprint registered,
 * hardware unsupported, etc.). One class centralizes all logic.
 *
 * ## Usage
 *
 * ```kotlin
 * biometricAuth.authenticate(activity) { success ->
 *     if (success) { /* open app */ }
 * }
 * ```
 */
@Singleton
class BiometricAuth @Inject constructor() {

    /**
     * Checks whether biometric authentication is available.
     *
     * @return true if biometrics are ready to use
     */
    fun isAvailable(activity: FragmentActivity): Boolean {
        val biometricManager = BiometricManager.from(activity)
        return when (biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG
        )) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
    }

    /**
     * Starts biometric authentication.
     *
     * @param onResult callback: true = succeeded, false = failed or cancelled
     */
    fun authenticate(
        activity: FragmentActivity,
        onResult: (Boolean) -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)

        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onResult(true)
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                onResult(false)
            }

            override fun onAuthenticationFailed() {
                onResult(false)
            }
        }

        val promptInfo = PromptInfo.Builder()
            .setTitle("Verify identity")
            .setSubtitle("Sign in to SecureNote")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG
                    or BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .build()

        val prompt = BiometricPrompt(activity, executor, callback)
        prompt.authenticate(promptInfo)
    }
}
