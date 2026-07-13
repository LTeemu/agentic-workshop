"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePreviewUrl, useAddPage, useFolders, useCreateFolder } from "@/lib/hooks/usePages";

interface FieldDef {
  id: string;
  label: string;
  cssSelector: string;
  attribute: "text" | "href" | "src";
  valueType: "text" | "number" | "boolean";
}

let fieldIdCounter = 0;
function newFieldId() {
  return `f_${++fieldIdCounter}`;
}

export default function AddPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);

  const { data: preview, isFetching: previewLoading, error: previewError } = usePreviewUrl(submittedUrl);
  const { data: folders = [] } = useFolders();
  const createFolder = useCreateFolder();
  const addPage = useAddPage();

  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const handlePreview = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSubmittedUrl(trimmed);
  }, [url]);

  const syncDetected = useCallback(() => {
    if (!preview?.detectedFields) return;
    setFields(
      preview.detectedFields.map((f) => ({
        id: newFieldId(),
        label: f.label,
        cssSelector: f.cssSelector,
        attribute: f.attribute,
        valueType: f.valueType,
      })),
    );
  }, [preview]);

  const updateField = (id: string, patch: Partial<FieldDef>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const addCustomField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: newFieldId(),
        label: "",
        cssSelector: "",
        attribute: "text",
        valueType: "text",
      },
    ]);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folder = await createFolder.mutateAsync({ name: newFolderName.trim() });
    setFolderId(folder.id);
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleSave = async () => {
    if (!submittedUrl || fields.length === 0) return;

    const result = await addPage.mutateAsync({
      url: submittedUrl,
      name: (preview?.title || "").slice(0, 500) || undefined,
      folderId,
      fields: fields.map(({ label, cssSelector, attribute, valueType }) => ({
        label,
        cssSelector,
        attribute,
        valueType,
      })),
    });

    router.push(`/dashboard/${result.id}`);
  };

  const hasChanges = JSON.stringify(fields.map((f) => f.label)) !== JSON.stringify(preview?.detectedFields?.map((f) => f.label) ?? []);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Page</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
        Paste a URL and define what data to track from it.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {/* Step 1: URL input */}
        <section className="p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>Step 1: Enter URL</h2>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handlePreview(); }}
              placeholder="https://example.com/product-page"
              className="min-w-0 flex-1 rounded-lg px-4 py-2.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
            />
            <button
              onClick={handlePreview}
              disabled={!url.trim() || previewLoading}
              style={{ background: 'var(--color-accent)', color: '#0c0c0f', borderRadius: 'var(--radius-lg)' }}
              className="cursor-pointer flex items-center gap-2 px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {previewLoading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M15 8A7 7 0 118 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
              Preview
            </button>
          </div>
          {previewError && (
            <p className="mt-2 text-sm" style={{ color: 'var(--color-error)' }}>
              {previewError instanceof Error ? previewError.message : "Failed to load page"}
            </p>
          )}
        </section>

        {/* Step 2: Preview result */}
        {preview && (
          <section className="p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>Step 2: Review</h2>

            {/* Page info */}
            <div className="mb-4 flex items-center gap-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {preview.image && (
                <img src={preview.image} alt={preview.title} className="h-12 w-12 flex-shrink-0 rounded-md object-cover" style={{ background: 'var(--color-bg)' }} />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{preview.title}</div>
                <div className="truncate text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{submittedUrl}</div>
              </div>
            </div>

            {/* Fields header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Fields to track ({fields.length})
              </h3>
              <div className="flex gap-1">
                {preview.detectedFields.length > 0 && !hasChanges && (
                  <button
                    onClick={syncDetected}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs transition-all hover:opacity-80"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={addCustomField}
                  className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all hover:opacity-80"
                  style={{ color: 'var(--color-accent)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Add Field
                </button>
              </div>
            </div>

            {/* Field list */}
            <div className="flex flex-col gap-2">
              {fields.map((field, i) => (
                <div key={field.id} className="rounded-lg p-3" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Field {i + 1}</span>
                    <button
                      onClick={() => removeField(field.id)}
                      className="cursor-pointer rounded p-0.5 transition-all hover:opacity-80"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M9.5 3v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="e.g. Price, Rating, Stock"
                        className="mt-0.5 w-full rounded-md px-2 py-1.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>CSS Selector</label>
                      <input
                        type="text"
                        value={field.cssSelector}
                        onChange={(e) => updateField(field.id, { cssSelector: e.target.value })}
                        placeholder="e.g. .price, [data-value]"
                        className="mt-0.5 w-full rounded-md px-2 py-1.5 text-sm font-mono placeholder:opacity-40 focus:outline-none focus:ring-1"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Attribute</label>
                      <select
                        value={field.attribute}
                        onChange={(e) => updateField(field.id, { attribute: e.target.value as "text" | "href" | "src" })}
                        className="mt-0.5 w-full rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                      >
                        <option value="text">Text content</option>
                        <option value="href">Link (href)</option>
                        <option value="src">Image (src)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Value Type</label>
                      <select
                        value={field.valueType}
                        onChange={(e) => updateField(field.id, { valueType: e.target.value as "text" | "number" | "boolean" })}
                        className="mt-0.5 w-full rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                      >
                        <option value="number">Number (chart)</option>
                        <option value="text">Text (log)</option>
                        <option value="boolean">Boolean (status)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {fields.length === 0 && (
              <p className="py-4 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                No fields defined.{" "}
                {preview.detectedFields.length > 0 ? (
                  <button onClick={syncDetected} className="cursor-pointer hover:underline" style={{ color: 'var(--color-accent)' }}>
                    Use auto-detected fields ({preview.detectedFields.length})
                  </button>
                ) : (
                  'Click "Add Field" to add one manually.'
                )}
              </p>
            )}

            {/* Folder selector */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Folder:</label>
              <select
                value={folderId ?? ""}
                onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
              >
                <option value="" style={{ background: 'var(--color-surface)' }}>No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: 'var(--color-surface)' }}>
                    {f.icon} {f.name}
                  </option>
                ))}
              </select>
              {showNewFolder ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }}
                  className="flex items-center gap-1"
                >
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Name"
                    className="w-28 rounded-md px-2 py-1.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1"
                    style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Add
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="cursor-pointer text-xs transition-colors hover:underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  + New
                </button>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={addPage.isPending || fields.length === 0 || fields.some((f) => !f.label || !f.cssSelector)}
              style={{ background: 'var(--color-accent)', color: '#0c0c0f', borderRadius: 'var(--radius-lg)' }}
              className="cursor-pointer mt-4 w-full px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {addPage.isPending ? "Saving..." : `Save Page (${fields.length} field${fields.length !== 1 ? "s" : ""})`}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
