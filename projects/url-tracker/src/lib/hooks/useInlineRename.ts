import { useEffect, useRef, useState } from 'react';

/**
 * Inline-rename plumbing shared by page cards and folder rows:
 * edit state, autofocus on start, trim-compare-commit, Escape-to-cancel.
 *
 * `onCommit(trimmed)` is called only when the name actually changed; closing
 * the editor always resets it.
 */
export function useInlineRename(initial: string, onCommit: (name: string) => void) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  /** Open the editor, seeding the input with the current name. */
  const startEdit = (): void => {
    setEditName(initial);
    setEditing(true);
  };

  /** Commit on enter/blur: trim, compare, call onCommit only on change. */
  const commitRename = (): void => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== initial) onCommit(trimmed);
    setEditing(false);
  };

  /** Close the editor and restore the original name (Escape). */
  const cancelRename = (): void => {
    setEditName(initial);
    setEditing(false);
  };

  return { editing, editName, setEditName, inputRef, startEdit, commitRename, cancelRename };
}
