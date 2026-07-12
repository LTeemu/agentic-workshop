"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFolders, useCreateFolder, useDeleteFolder, useTrackedPages } from "@/lib/hooks/usePages";

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
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all"
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
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all"
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
        <div key={folder.id} className="group flex items-center">
          <button
            onClick={() => navigateTo(String(folder.id))}
            className="flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-all"
            style={isActive(String(folder.id)) ? activeStyle : inactiveStyle}
          >
            <span className="text-sm">{folder.icon || "📁"}</span>
            <span className="flex-1 truncate">{folder.name}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{folder.pageCount}</span>
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete folder "${folder.name}"? Pages will be uncategorized.`)) {
                deleteFolder.mutate({ id: folder.id });
              }
            }}
            className="mr-1 hidden rounded p-1 group-hover:block"
            style={{ color: 'var(--color-text-tertiary)' }}
            title={`Delete ${folder.name}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M9.5 3v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
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
            className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-opacity disabled:opacity-40"
            style={{ color: 'var(--color-accent)' }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(""); }}
            className="rounded-md px-2 py-1.5 text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Esc
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all"
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
