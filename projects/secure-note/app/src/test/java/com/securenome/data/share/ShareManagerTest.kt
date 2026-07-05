package com.securenome.data.share

import android.content.Context
import com.securenome.security.CryptoManager
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Unit tests for ShareManager.
 *
 * Tests verify the server-first-then-local-fallback strategy
 * and revocation behavior.
 */
class ShareManagerTest {

    private val context: Context = mockk()
    private val cryptoManager: CryptoManager = mockk()
    private val shareApi: ShareApi = mockk()
    private lateinit var shareManager: ShareManager

    @Before
    fun setUp() {
        // Mock context to return a temp directory for shares
        every { context.filesDir } returns File(System.getProperty("java.io.tmpdir"))
        shareManager = ShareManager(context, cryptoManager, shareApi)
    }

    @Test
    fun `createShare uses server first and returns code on success`() = runTest {
        val noteData = "test data".toByteArray()
        val encryptedData = byteArrayOf(1, 2, 3)
        val base64Data = "AQID"
        val expectedCode = "A3F9-K2B1"

        every { cryptoManager.encrypt(noteData) } returns encryptedData
        coEvery { shareApi.createShare(any()) } returns Result.success(expectedCode)

        val code = shareManager.createShare(noteData)

        assertEquals("Must return the server-issued code", expectedCode, code)
    }

    @Test
    fun `createShare falls back to local file when server fails`() = runTest {
        val noteData = "test data".toByteArray()
        val encryptedData = byteArrayOf(1, 2, 3)

        every { cryptoManager.encrypt(noteData) } returns encryptedData
        coEvery { shareApi.createShare(any()) } returns Result.failure(ShareApiException("Server down"))

        val code = shareManager.createShare(noteData)

        assertNotNull("Must generate a local code on server failure", code)
        assertTrue(
            "Local code must match pattern XXXX-XXXX",
            code!!.matches(Regex("[A-Z0-9]{4}-[A-Z0-9]{4}"))
        )
    }

    @Test
    fun `importShare uses server first`() = runTest {
        val code = "A3F9-K2B1"
        val encryptedBase64 = "AQID"
        val encryptedBytes = byteArrayOf(1, 2, 3)
        val decryptedBytes = byteArrayOf(4, 5, 6)

        coEvery { shareApi.getShare(code) } returns Result.success(encryptedBase64)
        every { cryptoManager.decrypt(encryptedBytes) } returns decryptedBytes

        val result = shareManager.importShare(code)

        assertNotNull("Must return decrypted data from server", result)
        assertEquals(decryptedBytes.size, result!!.size)
    }

    @Test
    fun `importShare returns null when not found anywhere`() = runTest {
        val code = "NON1-EXIST"

        coEvery { shareApi.getShare(code) } returns Result.failure(ShareNotFoundException(code))

        val result = shareManager.importShare(code)

        assertNull("Must return null when share not found", result)
    }

    @Test
    fun `revokeShare calls server and cleans local file`() = runTest {
        val code = "A3F9-K2B1"

        coEvery { shareApi.revokeShare(code) } returns Result.success(Unit)

        val result = shareManager.revokeShare(code)

        assertTrue("Revocation must succeed", result.isSuccess)
        verify { shareApi.revokeShare(code) }
    }

    @Test
    fun `revokeShare returns failure when server fails`() = runTest {
        val code = "A3F9-K2B1"

        coEvery { shareApi.revokeShare(code) } returns Result.failure(ShareApiException("Server down"))

        val result = shareManager.revokeShare(code)

        assertTrue("Must propagate server failure", result.isFailure)
        verify { shareApi.revokeShare(code) }
    }

    @Test
    fun `isServerReachable delegates to healthCheck`() = runTest {
        coEvery { shareApi.healthCheck() } returns Result.success(true)

        val reachable = shareManager.isServerReachable()

        assert(reachable)
        verify { shareApi.healthCheck() }
    }
}
