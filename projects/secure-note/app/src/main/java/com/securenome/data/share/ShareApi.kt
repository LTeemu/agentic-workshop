package com.securenome.data.share

import com.securenome.BuildConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

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
     * Upload an encrypted blob and get a share code.
     * @return The share code, or null on failure.
     */
    fun createShare(blobBase64: String): Result<String> = runCatching {
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

    /**
     * Retrieve an encrypted blob by share code.
     * @return The base64-encoded blob, or null if not found/expired.
     */
    fun getShare(code: String): Result<String> = runCatching {
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

    /**
     * Revoke a share before it is read.
     */
    fun revokeShare(code: String): Result<Unit> = runCatching {
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

    /** Check if the server is reachable. */
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
