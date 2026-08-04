package com.securenome.ui.notelist

import com.securenome.data.local.entity.NoteType
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Search filtering is the note list's primary interaction, yet it was only
 * exercised through MockK/coroutine ViewModel tests (which set the query but
 * never asserted the actual filtered result). These direct value-table tests
 * lock down the matching behavior.
 */
class NoteSearchTest {

    private fun summary(
        id: Long,
        type: NoteType,
        preview: String,
        photoNames: List<String> = emptyList(),
    ) = NoteSummary(
        id = id,
        type = type,
        preview = preview,
        hasChecklist = false,
        photoCount = photoNames.size,
        photoNames = photoNames,
        updatedAt = 0,
        shareCode = null,
    )

    private val notes = listOf(
        summary(1, NoteType.TEXT, "Groceries for the week"),
        summary(2, NoteType.CHECKLIST, "Packing list"),
        summary(3, NoteType.TEXT, "Meeting notes", photoNames = listOf("Family trip")),
    )

    @Test
    fun `empty query returns all notes`() {
        assertEquals(notes, filterNoteSummaries(notes, ""))
    }

    @Test
    fun `blank query returns all notes`() {
        assertEquals(notes, filterNoteSummaries(notes, "   "))
    }

    @Test
    fun `matches preview text case-insensitively`() {
        assertEquals(listOf(notes[0]), filterNoteSummaries(notes, "grocer"))
    }

    @Test
    fun `matches any substring of the preview`() {
        assertEquals(listOf(notes[0]), filterNoteSummaries(notes, "for the week"))
    }

    @Test
    fun `matches the note type label`() {
        // checklist note matches query "checklist" even though its preview doesn't.
        assertEquals(listOf(notes[1]), filterNoteSummaries(notes, "checklist"))
        // text notes match query "text".
        assertEquals(listOf(notes[0], notes[2]), filterNoteSummaries(notes, "text"))
    }

    @Test
    fun `matches photo names case-insensitively`() {
        assertEquals(listOf(notes[2]), filterNoteSummaries(notes, "FAMILY"))
    }

    @Test
    fun `returns empty when nothing matches`() {
        assertEquals(emptyList<NoteSummary>(), filterNoteSummaries(notes, "zzzzz"))
    }

    @Test
    fun `typeLabel maps note types to display labels`() {
        assertEquals("Text", typeLabel(NoteType.TEXT))
        assertEquals("Text", typeLabel(NoteType.PHOTO))
        assertEquals("Checklist", typeLabel(NoteType.CHECKLIST))
    }
}