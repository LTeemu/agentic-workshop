package com.securenome.data.share

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Share code generation is user-typed and read aloud, so its format is a
 * contract worth locking down deterministically: every code must match the
 * `XXXX-XXXX` pattern shown in the import UI, use only unambiguous symbols,
 * and not collide in practice.
 */
class ShareCodeGeneratorTest {

    private val format = Regex("[A-Z0-9]{4}-[A-Z0-9]{4}")

    @Test
    fun `every generated code matches the XXXX-XXXX format`() {
        for (i in 0 until 200) {
            val code = ShareCodeGenerator.generate()
            assertTrue("Code '$code' must match XXXX-XXXX", code.matches(format))
        }
    }

    @Test
    fun `code has the hyphen exactly after the fourth character`() {
        val code = ShareCodeGenerator.generate()
        assertEquals(9, code.length)
        assertEquals('-', code[4])
    }

    @Test
    fun `codes never contain ambiguous characters`() {
        for (i in 0 until 200) {
            val code = ShareCodeGenerator.generate()
            assertFalse("Must not contain ambiguous '0'", code.contains('0'))
            assertFalse("Must not contain ambiguous '1'", code.contains('1'))
            assertFalse("Must not contain ambiguous 'I'", code.contains('I'))
            assertFalse("Must not contain ambiguous 'O'", code.contains('O'))
        }
    }

    @Test
    fun `codes are distinct across a large batch`() {
        val codes = (0 until 1000).map { ShareCodeGenerator.generate() }.toSet()
        assertEquals("1000 generated codes must be unique", 1000, codes.size)
    }
}