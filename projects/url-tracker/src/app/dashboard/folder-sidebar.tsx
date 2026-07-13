"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFolders, useCreateFolder, useDeleteFolder, useRenameFolder, useTrackedPages } from "@/lib/hooks/usePages";

export function FolderSidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [activeFolderParam, setActiveFolderParam] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("folder") ?? null;
    }
    return null;
  });

  // Sync with browser back/forward
  useEffect(() => {
    const sync = () => {
      setActiveFolderParam(new URLSearchParams(window.location.search).get("folder") ?? null);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const { data: folders = [] } = useFolders();
  const { data: allPages = [] } = useTrackedPages();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const renameFolder = useRenameFolder();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const navigateTo = (folder: string | null) => {
    setActiveFolderParam(folder);
    const params = new URLSearchParams();
    if (folder !== null) params.set("folder", folder);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard");
    onClose?.();
  };

  const isActive = (folder: string | null) => {
    if (folder === null) return activeFolderParam === null;
    return activeFolderParam === folder;
  };

  const handleCreateFolder = async () => {
    if (!newName.trim()) return;
    await createFolder.mutateAsync({ name: newName.trim() });
    setNewName("");
    setAdding(false);
  };

  const activeStyle = {
    background: 'var(--color-accent-subtle)',
    color: 'var(--color-accent)',
  };
  const inactiveStyle = {
    color: 'var(--color-text-secondary)',
  };

  return (
    <aside className="flex w-full flex-col gap-0.5 lg:w-56">
      {/* All Pages */}
      <button
        onClick={() => navigateTo(null)}
        className="cursor-pointer flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all hover:opacity-80"
        style={isActive(null) ? activeStyle : inactiveStyle}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
          <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4.5 4.5h6M4.5 7.5h6M4.5 10.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <span className="flex-1">All Pages</span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{allPages.length}</span>
      </button>

      {/* Uncategorized */}
      <button
        onClick={() => navigateTo("uncategorized")}
        className="cursor-pointer flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all hover:opacity-80"
        style={isActive("uncategorized") ? activeStyle : inactiveStyle}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
          <rect x="2" y="3" width="11" height="9" rx="1.3" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 6h11" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span className="flex-1">Uncategorized</span>
      </button>

      {/* Divider */}
      <div style={{ margin: '0.375rem 0', borderTop: '1px solid var(--color-border)' }} />

      {/* Folder list */}
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          isActive={isActive(String(folder.id))}
          activeStyle={activeStyle}
          inactiveStyle={inactiveStyle}
          onNavigate={() => navigateTo(String(folder.id))}
          onDelete={() => {
            if (confirm(`Delete folder "${folder.name}"? Pages will be uncategorized.`)) {
              deleteFolder.mutate({ id: folder.id });
            }
          }}
          onRename={(name) => renameFolder.mutate({ id: folder.id, name })}
        />
      ))}

      {/* New folder */}
      {adding ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}
          className="flex items-center gap-1.5 px-2 pt-1"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            className="min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-sm"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          />
          <button
            type="submit"
            disabled={!newName.trim() || createFolder.isPending}
            className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-40 hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(""); }}
            className="cursor-pointer rounded-md px-2 py-1.5 text-xs transition-all hover:opacity-80"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Esc
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="cursor-pointer mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all hover:opacity-80"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          New Folder
        </button>
      )}
    </aside>
  );
}

// ── Folder Row with inline rename ──

function FolderRow({
  folder, isActive, activeStyle, inactiveStyle, onNavigate, onDelete, onRename,
}: {
  folder: { id: number; name: string; icon: string | null; pageCount: number };
  isActive: boolean;
  activeStyle: React.CSSProperties;
  inactiveStyle: React.CSSProperties;
  onNavigate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div key={folder.id} className="group relative flex w-full items-center">
      {editing ? (
        <form
          onSubmit={(e) => { e.preventDefault(); commitRename(); }}
          className="flex flex-1 items-center gap-1 rounded-md px-2 py-1"
          style={{ background: 'var(--color-accent-subtle)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm shrink-0">{folder.icon || "📁"}</span>
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Escape") { setEditName(folder.name); setEditing(false); } }}
            className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm outline-none"
            style={{ color: 'var(--color-accent)' }}
          />
        </form>
      ) : (
        <button
          onClick={onNavigate}
          className="cursor-pointer min-w-0 flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all hover:opacity-80"
          style={isActive ? activeStyle : inactiveStyle}
        >
          <span className="text-sm shrink-0">{folder.icon || "📁"}</span>
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          <span className="text-xs group-hover:hidden" style={{ color: 'var(--color-text-tertiary)' }}>{folder.pageCount}</span>
        </button>
      )}
      {/* Overlay actions — sit in reserved right padding, count hides behind them */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden gap-0.5 rounded-md p-0.5 group-hover:flex"
        style={{ background: 'color-mix(in srgb, var(--color-surface) 85%, transparent)', border: '1px solid var(--color-border)' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(folder.name); }}
          className="cursor-pointer rounded p-1 transition-colors hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
          title={`Rename ${folder.name}`}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M8 1l2 2L3 10.5H1v-2L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="cursor-pointer rounded p-1 transition-colors hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
          title={`Delete ${folder.name}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M13 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 7v4M10 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
