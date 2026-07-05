package com.securenome.data.share

import com.securenome.BuildConfig
import kotlinx.coroutines.delay
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.pow

/**
 * OkHttp client for the SecureNote share relay server.
 *
 * ## Why OkHttp and not Retrofit?
 *
 * Retrofit is great for complex APIs but adds annotation processing.
 * For 3 simple endpoints, OkHttp is lighter and easier to understand.
 * The JSON parsing uses kotlinx-serialization directly.
 *
 * ## Server endpoints
 *
 * POST   /api/shares       → create a share, returns a code
 * GET    /api/shares/:code → retrieve a blob by code (one-shot)
 * DELETE /api/shares/:code → revoke a share before it is read
 *
 * ## Retry policy
 *
 * Every mutating call (create, get, revoke) retries up to 3 times
 * with exponential backoff (1s, 2s, 4s). Transient network blips
 * are automatically recovered. Health checks are NOT retried —
 * a quick snapshot of reachability is preferred.
 */
@Serializable
private data class CreateRequest(val blob: String)
@Serializable
private data class CreateResponse(val code: String, val expiresInMs: Long? = null)
@Serializable
private data class BlobResponse(val blob: String)
@Serializable
private data class ErrorResponse(val error: String)

@Singleton
class ShareApi @Inject constructor() {

    companion object {
        private const val MAX_RETRIES = 3
        private const val BASE_DELAY_MS = 1000L
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val json = Json { ignoreUnknownKeys = true }
    private val mediaType = "application/json".toMediaType()

    /** Base URL for the share server. Set at compile time via BuildConfig. */
    private val baseUrl: String = BuildConfig.SHARE_SERVER_URL

    /**
     * Execute a network call with exponential backoff retry.
     *
     * Retries on any exception (IOException, timeout, server error)
     * up to [MAX_RETRIES] times with delays: 1s, 2s, 4s.
     * Suspends between retries so it must be called from a coroutine
     * or from [runCatching] inside a suspend caller.
     */
    private suspend fun <T> retryWithBackoff(block: () -> T): T {
        var lastException: Exception? = null
        for (attempt in 0..MAX_RETRIES) {
            try {
                return block()
            } catch (e: Exception) {
                lastException = e
                if (attempt < MAX_RETRIES) {
                    val delayMs = BASE_DELAY_MS * 2.0.pow(attempt.toDouble()).toLong()
                    delay(delayMs)
                }
            }
        }
        throw lastException ?: ShareApiException("Retry exhausted")
    }

    /**
     * Upload an encrypted blob and get a share code.
     * @return The share code.
     *
     * ## Why manual try-catch instead of runCatching?
     *
     * runCatching's lambda is `() -> T` (non-suspend), but retryWithBackoff
     * is a suspend function. Manual try-catch lets us call suspend code.
     */
    suspend fun createShare(blobBase64: String): Result<String> = try {
        val code = retryWithBackoff {
            val body = json.encodeToString(CreateRequest.serializer(), CreateRequest(blobBase64))
            val request = Request.Builder()
                .url("$baseUrl/api/shares")
                .post(body.toRequestBody(mediaType))
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                val error = response.body?.string()
                throw ShareApiException("Server returned ${response.code}: $error")
            }

            val responseBody = response.body?.string() ?: throw ShareApiException("Empty response")
            val parsed = json.decodeFromString(CreateResponse.serializer(), responseBody)
            parsed.code
        }
        Result.success(code)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /**
     * Retrieve an encrypted blob by share code.
     * @return The base64-encoded blob.
     */
    suspend fun getShare(code: String): Result<String> = try {
        val blob = retryWithBackoff {
            val request = Request.Builder()
                .url("$baseUrl/api/shares/$code")
                .get()
                .build()

            val response = client.newCall(request).execute()
            when {
                response.code == 404 -> throw ShareNotFoundException(code)
                !response.isSuccessful -> {
                    val error = response.body?.string()
                    throw ShareApiException("Server returned ${response.code}: $error")
                }
                else -> {
                    val responseBody = response.body?.string()
                        ?: throw ShareApiException("Empty response")
                    val parsed = json.decodeFromString(BlobResponse.serializer(), responseBody)
                    parsed.blob
                }
            }
        }
        Result.success(blob)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /**
     * Revoke a share before it is read.
     */
    suspend fun revokeShare(code: String): Result<Unit> = try {
        retryWithBackoff {
            val request = Request.Builder()
                .url("$baseUrl/api/shares/$code")
                .delete()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful && response.code != 404) {
                val error = response.body?.string()
                throw ShareApiException("Server returned ${response.code}: $error")
            }
        }
        Result.success(Unit)
    } catch (e: Exception) {
        Result.failure(e)
    }

    /** Check if the server is reachable (no retry — quick check). */
    fun healthCheck(): Result<Boolean> = runCatching {
        val request = Request.Builder()
            .url("$baseUrl/health")
            .get()
            .build()

        val response = client.newCall(request).execute()
        response.isSuccessful
    }
}

class ShareApiException(message: String) : Exception(message)
class ShareNotFoundException(code: String) : Exception("Share $code not found or expired")
