package com.securenome.ui.notelist

import com.securenome.data.local.entity.NoteType

/** User-facing label for a note type. Must match what NoteCard shows. */
internal fun typeLabel(type: NoteType): String = when (type) {
    NoteType.TEXT, NoteType.PHOTO -> "Text"
    NoteType.CHECKLIST -> "Checklist"
}

/**
 * Filter note summaries by a search query. A blank/empty query shows all
 * notes. Matching is case-insensitive against the decrypted preview text,
 * the note type label, and any photo names.
 */
internal fun filterNoteSummaries(notes: List<NoteSummary>, query: String): List<NoteSummary> {
    if (query.isBlank()) return notes
    return notes.filter { note ->
        note.preview.contains(query, ignoreCase = true) ||
            typeLabel(note.type).contains(query, ignoreCase = true) ||
            note.photoNames.any { it.contains(query, ignoreCase = true) }
    }
}