package com.securenome.util

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Checklist normalization determines what gets persisted for a note, so its
 * exact trim / blank-drop / case-insensitive-dedup rules are locked down with
 * a value table instead of being exercised only through repository mocks.
 */
class ChecklistNormalizerTest {

    @Test
    fun `trims surrounding whitespace from each item`() {
        assertEquals(
            listOf("Milk", "Bread"),
            normalizeChecklistItems(listOf("  Milk  ", "\tBread\n"))
        )
    }

    @Test
    fun `drops blank and whitespace-only items`() {
        assertEquals(
            listOf("Eggs"),
            normalizeChecklistItems(listOf("Eggs", "", "   ", "\t", ""))
        )
    }

    @Test
    fun `removes case-insensitive duplicates keeping the first occurrence`() {
        assertEquals(
            listOf("Milk", "Eggs"),
            normalizeChecklistItems(listOf("Milk", "milk", "MILK", "Eggs", "eggs"))
        )
    }

    @Test
    fun `preserves original order`() {
        assertEquals(
            listOf("B", "A", "C"),
            normalizeChecklistItems(listOf("B", "A", "C"))
        )
    }

    @Test
    fun `trims before deduplicating`() {
        // "  Milk " and "milk" collapse to the same canonical item.
        assertEquals(
            listOf("Milk", "Eggs"),
            normalizeChecklistItems(listOf("  Milk ", "milk", " Eggs"))
        )
    }

    @Test
    fun `empty input yields empty output`() {
        assertEquals(emptyList<String>(), normalizeChecklistItems(emptyList()))
    }

    @Test
    fun `input of only blanks yields empty output`() {
        assertEquals(emptyList<String>(), normalizeChecklistItems(listOf(" ", "\t", "  ")))
    }

    @Test
    fun `canonical key folds case and trims deterministically`() {
        // The editor and repository both dedup through this key, so it must
        // treat differently-cased and whitespace-padded inputs as equal.
        assertEquals(canonicalChecklistKey("Milk"), canonicalChecklistKey("milk"))
        assertEquals(canonicalChecklistKey("  Milk  "), canonicalChecklistKey("milk"))
    }
}