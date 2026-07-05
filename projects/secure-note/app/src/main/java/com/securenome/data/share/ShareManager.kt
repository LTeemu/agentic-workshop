package com.securenome.data.share

import android.content.Context
import com.securenome.security.CryptoManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.security.SecureRandom
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages note sharing via share-code.
 *
 * ## Sharing strategy (server-first with local fallback)
 *
 * 1. Try the relay server (POST /api/shares with encrypted blob)
 * 2. If server is unreachable → export as .securenome file for manual transfer
 *
 * ## Import strategy
 *
 * 1. Try the relay server (GET /api/shares/:code)
 * 2. If not found on server → look for a local .securenome file
 *
 * This keeps the app offline-first: sharing degrades gracefully
 * when there is no network, but works seamlessly when online.
 */
@Singleton
class ShareManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val cryptoManager: CryptoManager,
    private val shareApi: ShareApi
) {
    private val shareDir: File
        get() = File(context.filesDir, "shares").also { it.mkdirs() }

    @Serializable
    data class ShareBlob(
        val encryptedNoteData: ByteArray,
        val createdAt: Long
    )

    /**
     * Create a share. Tries server first, falls back to local export.
     *
     * @param noteData Unencrypted note data (JSON).
     * @return The share code, or null on failure.
     */
    suspend fun createShare(noteData: ByteArray): String? = withContext(Dispatchers.IO) {
        // Encrypt the note data
        val encryptedData = cryptoManager.encrypt(noteData)
        val base64Data = Base64.getEncoder().encodeToString(encryptedData)

        // Try server relay first
        val result = shareApi.createShare(base64Data)
        if (result.isSuccess) {
            val code = result.getOrThrow()
            println("[ShareManager] Created server share: $code")
            return@withContext code
        }
        println("[ShareManager] Server unavailable, falling back to local export")

        // Fallback: local .securenome file
        val localCode = generateLocalCode()
        val blob = ShareBlob(
            encryptedNoteData = encryptedData,
            createdAt = System.currentTimeMillis()
        )
        val json = Json.encodeToString(blob)

        // Save as .securenome file for manual transfer
        val exportFile = File(shareDir, "$localCode.securenome")
        exportFile.writeText(json)

        println("[ShareManager] Created local share: $localCode")
        localCode
    }

    /**
     * Import a share by code. Tries server first, then local files.
     *
     * @return Decrypted note data, or null if not found.
     */
    suspend fun importShare(code: String): ByteArray? = withContext(Dispatchers.IO) {
        // Try server relay first
        val result = shareApi.getShare(code)
        if (result.isSuccess) {
            val base64Data = result.getOrThrow()
            val encryptedData = Base64.getDecoder().decode(base64Data)
            val decrypted = cryptoManager.decrypt(encryptedData)
            println("[ShareManager] Imported from server: $code")
            return@withContext decrypted
        }
        println("[ShareManager] Server fetch failed, trying local files")

        // Fallback: look for local .securenome file
        try {
            val file = File(shareDir, "$code.securenome")
            if (!file.exists()) return@withContext null
            val blob = Json.decodeFromString<ShareBlob>(file.readText())
            cryptoManager.decrypt(blob.encryptedNoteData)
        } catch (e: Exception) {
            println("[ShareManager] Local import failed: ${e.message}")
            null
        }
    }

    /**
     * Revoke a share. Tries server and local cleanup.
     * @return The result of the server revocation (caller can check for failure).
     */
    suspend fun revokeShare(code: String): Result<Unit> = withContext(Dispatchers.IO) {
        val result = shareApi.revokeShare(code)
        // Also clean up local file
        File(shareDir, "$code.securenome").delete()
        result
    }

    /**
     * Check if the share server is reachable.
     */
    suspend fun isServerReachable(): Boolean = withContext(Dispatchers.IO) {
        shareApi.healthCheck().getOrDefault(false)
    }

    private fun generateLocalCode(): String {
        val random = SecureRandom()
        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        fun pair() = "${chars[random.nextInt(chars.length)]}${chars[random.nextInt(chars.length)]}"
        return "${pair()}${pair()}-${pair()}${pair()}"
    }
}
