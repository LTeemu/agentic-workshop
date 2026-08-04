package com.securenome.util

import java.util.Locale

/**
 * Normalize a batch of raw checklist inputs before persisting.
 *
 * Trims surrounding whitespace, drops blank entries, and removes
 * case-insensitive duplicates, keeping the first occurrence.
 *
 * All checklist dedup paths (the repository bulk insert, the repository
 * single-add, and the editor ViewModel) compare items through
 * [canonicalChecklistKey], so every path folds case the same way.
 */
fun normalizeChecklistItems(items: List<String>): List<String> {
    val seen = mutableSetOf<String>()
    return items
        .map { it.trim() }
        .filter { it.isNotEmpty() && seen.add(canonicalChecklistKey(it)) }
}

/**
 * Locale-independent canonical key for a checklist item: trimmed and folded
 * to [Locale.ROOT]. Used by every checklist dedup path so they agree exactly.
 */
fun canonicalChecklistKey(text: String): String = text.trim().lowercase(Locale.ROOT)