"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  usePageDetail, useFieldHistory, useScrapePage, useRemovePage,
  useFolders, useMovePage, useUpdateField, useAddField, useDeleteField,
  useUpdatePage,
} from "@/lib/hooks/usePages";
import { createChart, LineSeries, type IChartApi, type ISeriesApi, type LineData, type Time } from "lightweight-charts";

// ── Types ──

interface Field {
  id: number;
  label: string;
  cssSelector: string;
  attribute: string;
  valueType: string;
  sortOrder: number;
  notifyOnChange: boolean;
  alertMin: string | null;
  alertMax: string | null;
}

// ── Main Page ──

export default function PageDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pageId = Number(params.id);

  const { data: page, isLoading } = usePageDetail(pageId);
  const scrapePage = useScrapePage();
  const removePage = useRemovePage();
  const { data: folders = [] } = useFolders();
  const movePage = useMovePage();
  const updatePage = useUpdatePage();
  const [scrapeErrors, setScrapeErrors] = useState<Record<number, string>>({});

  const handleScrape = () => {
    scrapePage.mutate(
      { pageId },
      {
        onSuccess: (data) => {
          const errors: Record<number, string> = {};
          for (const v of data.values) {
            if (v.error) errors[v.fieldId] = v.error;
          }
          setScrapeErrors(errors);
        },
      },
    );
  };

  const handleDelete = () => {
    if (confirm(`Delete "${page?.name || "this page"}" and all its data?`)) {
      removePage.mutate({ pageId }, { onSuccess: () => router.push("/dashboard") });
    }
  };

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    transition: 'all 0.15s',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-5 w-40 animate-pulse rounded" style={{ background: 'var(--color-surface)' }} />
        <div className="h-4 w-64 animate-pulse rounded" style={{ background: 'var(--color-surface)' }} />
        <div className="h-48 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p style={{ color: 'var(--color-text-tertiary)' }}>Page not found.</p>
      </div>
    );
  }

  const domain = new URL(page.url).hostname.replace(/^www\./, "");

  // Scrape interval options
  const intervals = [
    { value: "manual", label: "Manual" },
    { value: "hourly", label: "Every Hour" },
    { value: "daily", label: "Every Day" },
  ] as const;

  const selectStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm transition-colors"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M8.5 3L5 6.5 8.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{page.name || domain}</h1>
            <span className="chip shrink-0">{domain}</span>
          </div>
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-sm transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            {page.url}
          </a>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          {/* Scrape interval */}
          <select
            value={page.scrapeInterval || "manual"}
            onChange={(e) => updatePage.mutate({ pageId: page.id, scrapeInterval: e.target.value as "manual" | "hourly" | "daily" })}
            style={selectStyle}
            className="w-full px-2 py-1.5 text-xs sm:w-auto"
          >
            {intervals.map((i) => (
              <option key={i.value} value={i.value} style={{ background: 'var(--color-surface)' }}>
                {i.label}
              </option>
            ))}
          </select>

          {/* Folder selector */}
          <select
            value={page.folderId ?? ""}
            onChange={(e) => movePage.mutate({ pageId: page.id, folderId: e.target.value ? Number(e.target.value) : null })}
            style={selectStyle}
            className="w-full px-2 py-1.5 text-xs sm:w-auto"
          >
            <option value="" style={{ background: 'var(--color-surface)' }}>No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id} style={{ background: 'var(--color-surface)' }}>
                {f.icon} {f.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleScrape}
            disabled={scrapePage.isPending || page.fields.length === 0}
            style={{ ...btnBase, background: 'var(--color-accent)', color: '#0c0c0f' }}
            className="w-full justify-center disabled:opacity-40 sm:w-auto"
          >
            {scrapePage.isPending ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                <path d="M12.5 7A5.5 5.5 0 117 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M11 6.5a4.5 4.5 0 11-4.5-4.5M11 2v3H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            Scrape Now
          </button>

          <button
            onClick={handleDelete}
            style={{ ...btnBase, border: '1px solid var(--color-border)', color: 'var(--color-error)' }}
            className="w-full justify-center sm:w-auto"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Fields */}
      {page.fields.length === 0 && (
        <div className="flex items-center justify-center rounded-xl p-8 text-sm" style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-tertiary)', background: 'var(--color-surface)' }}>
          No fields defined for this page.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {page.fields.map((field: Field) => {
          const error = scrapeErrors[field.id];
          if (field.valueType === "number") {
            return <NumericFieldCard key={field.id} pageId={pageId} field={field} scrapeError={error} />;
          }
          return <TextFieldCard key={field.id} field={field} scrapeError={error} />;
        })}

        {/* Add Field */}
        <AddFieldForm pageId={pageId} fieldsCount={page.fields.length} />
      </div>
    </div>
  );
}

// ── Add Field Form ──

function AddFieldForm({ pageId, fieldsCount }: { pageId: number; fieldsCount: number }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [cssSelector, setCssSelector] = useState("");
  const [attribute, setAttribute] = useState<"text" | "href" | "src">("text");
  const [valueType, setValueType] = useState<"text" | "number" | "boolean">("text");
  const addField = useAddField();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !cssSelector.trim()) return;
    addField.mutate(
      { pageId, label: label.trim(), cssSelector: cssSelector.trim(), attribute, valueType },
      { onSuccess: () => { setOpen(false); setLabel(""); setCssSelector(""); } },
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl p-4 text-sm transition-all"
        style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-tertiary)', background: 'var(--color-surface)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Add Field
      </button>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>New Field #{fieldsCount + 1}</span>
        <button type="button" onClick={() => setOpen(false)} style={{ color: 'var(--color-text-tertiary)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label"
          className="rounded-md px-2.5 py-1.5 text-sm placeholder:opacity-40 focus:outline-none focus:ring-1"
          style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} required />
        <input type="text" value={cssSelector} onChange={(e) => setCssSelector(e.target.value)} placeholder="CSS selector"
          className="rounded-md px-2.5 py-1.5 text-sm font-mono placeholder:opacity-40 focus:outline-none focus:ring-1"
          style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} required />
        <select value={attribute} onChange={(e) => setAttribute(e.target.value as any)}
          className="rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
          style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}>
          <option value="text" style={{ background: 'var(--color-surface)' }}>Text</option>
              <option value="href" style={{ background: 'var(--color-surface)' }}>Link</option>
              <option value="src" style={{ background: 'var(--color-surface)' }}>Image</option>
        </select>
        <select value={valueType} onChange={(e) => setValueType(e.target.value as any)}
          className="rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
          style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}>
          <option value="number" style={{ background: 'var(--color-surface)' }}>Number</option>
              <option value="text" style={{ background: 'var(--color-surface)' }}>Text</option>
              <option value="boolean" style={{ background: 'var(--color-surface)' }}>Boolean</option>
        </select>
      </div>
      <button type="submit" disabled={addField.isPending || !label.trim() || !cssSelector.trim()}
        style={{ background: 'var(--color-accent)', color: '#0c0c0f', borderRadius: 'var(--radius-md)' }}
        className="mt-2 w-full px-3 py-1.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all">
        {addField.isPending ? "Adding..." : "Add Field"}
      </button>
    </form>
  );
}

// ── Numeric Field Card ──

function NumericFieldCard({ pageId, field, scrapeError }: { pageId: number; field: Field; scrapeError?: string }) {
  const { data: history = [] } = useFieldHistory(field.id, 500);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const updateField = useUpdateField();
  const deleteField = useDeleteField();
  const [editing, setEditing] = useState(false);

  // Edit state
  const [editLabel, setEditLabel] = useState(field.label);
  const [editSelector, setEditSelector] = useState(field.cssSelector);
  const [editAttr, setEditAttr] = useState(field.attribute);
  const [editType, setEditType] = useState(field.valueType);
  const [editNotify, setEditNotify] = useState(field.notifyOnChange);
  const [editAlertMin, setEditAlertMin] = useState(field.alertMin ?? "");
  const [editAlertMax, setEditAlertMax] = useState(field.alertMax ?? "");

  const saveEdit = () => {
    updateField.mutate({
      fieldId: field.id,
      label: editLabel,
      cssSelector: editSelector,
      attribute: editAttr as any,
      valueType: editType as any,
      notifyOnChange: editNotify,
      alertMin: editAlertMin || null,
      alertMax: editAlertMax || null,
    });
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete field "${field.label}"?`)) {
      deleteField.mutate({ fieldId: field.id });
    }
  };

  // Compute KPIs
  const values = history
    .map((h) => ({ value: parseFloat(h.value), time: h.scrapedAt }))
    .filter((v) => !isNaN(v.value))
    .reverse();

  const current = values.length > 0 ? values[values.length - 1].value : null;
  const previous = values.length > 1 ? values[values.length - 2].value : null;
  const min = values.length > 0 ? Math.min(...values.map((v) => v.value)) : null;
  const max = values.length > 0 ? Math.max(...values.map((v) => v.value)) : null;
  const avg = values.length > 0 ? values.reduce((s, v) => s + v.value, 0) / values.length : null;

  // Change direction
  const change = current !== null && previous !== null ? current - previous : null;
  const changeDir = change !== null ? (change > 0 ? "up" : change < 0 ? "down" : "flat") : null;

  // Chart setup
  useEffect(() => {
    if (!chartContainerRef.current || values.length === 0) return;
    const chart = createChart(chartContainerRef.current, {
      height: 200,
      layout: { background: { color: "transparent" }, textColor: "#71717a" },
      grid: { vertLines: { color: "#1f1f23" }, horzLines: { color: "#1f1f23" } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a", visible: true, timeVisible: false },
      handleScroll: false, handleScale: false,
    });
    const series = chart.addSeries(LineSeries, {
      color: "#2dd4bf", lineWidth: 2, priceLineVisible: false,
      lastValueVisible: true, crosshairMarkerVisible: true,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, [field.id]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || values.length === 0) return;
    series.setData(values.map((v) => ({
      time: (Math.floor(new Date(v.time).getTime() / 1000) as Time),
      value: v.value,
    })));
    chart.timeScale().fitContent();
  }, [values]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }} className="p-4">
      {/* Header with actions */}
      <div className="mb-4 flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
              className="min-w-0 flex-1 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1"
              style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
            <input type="text" value={editSelector} onChange={(e) => setEditSelector(e.target.value)}
              className="min-w-0 flex-[2] rounded-md px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1"
              style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
             <select value={editAttr} onChange={(e) => setEditAttr(e.target.value)}
               className="rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1"
               style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}>
               <option value="text" style={{ background: 'var(--color-surface)' }}>Text</option>
               <option value="href" style={{ background: 'var(--color-surface)' }}>Link</option>
               <option value="src" style={{ background: 'var(--color-surface)' }}>Image</option>
             </select>
             <select value={editType} onChange={(e) => setEditType(e.target.value)}
               className="rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1"
               style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}>
               <option value="number" style={{ background: 'var(--color-surface)' }}>Number</option>
               <option value="text" style={{ background: 'var(--color-surface)' }}>Text</option>
               <option value="boolean" style={{ background: 'var(--color-surface)' }}>Boolean</option>
             </select>
             <button onClick={saveEdit} style={{ color: 'var(--color-accent)' }}
               className="rounded-md px-2 py-1 text-xs font-semibold">Save</button>
             <button onClick={() => setEditing(false)} style={{ color: 'var(--color-text-tertiary)' }}
               className="rounded-md px-2 py-1 text-xs">Cancel</button>
           </div>
         ) : (
           <>
             <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{field.label}</h3>
              <span className="data-value shrink-0 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{field.cssSelector}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Change direction badge */}
              {changeDir === "up" && <span className="chip text-[10px]" style={{ color: 'var(--color-success)', background: 'rgba(34,197,94,0.12)' }}>↑</span>}
              {changeDir === "down" && <span className="chip text-[10px]" style={{ color: 'var(--color-error)', background: 'rgba(239,68,68,0.12)' }}>↓</span>}
              {field.notifyOnChange && <span className="chip text-[10px]" style={{ color: 'var(--color-accent)' }}>🔔</span>}
              <button onClick={() => {
                setEditLabel(field.label); setEditSelector(field.cssSelector);
                setEditAttr(field.attribute); setEditType(field.valueType);
                setEditNotify(field.notifyOnChange);
                setEditAlertMin(field.alertMin ?? ""); setEditAlertMax(field.alertMax ?? "");
                setEditing(true);
              }} className="rounded p-0.5 transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 1.5l2 2L4 11H2V9l7.5-7.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={handleDelete} className="rounded p-0.5 transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M9.5 3v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scrape error banner */}
      {scrapeError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg p-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 4.5v3M7 9.5v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span>{scrapeError}</span>
        </div>
      )}

      {/* Alert config (shown when editing) */}
      {editing && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={editNotify} onChange={(e) => setEditNotify(e.target.checked)}
              className="rounded" style={{ accentColor: 'var(--color-accent)' }} />
            Notify on change
          </label>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Alert if below
            <input type="text" value={editAlertMin} onChange={(e) => setEditAlertMin(e.target.value)}
              placeholder="—" className="w-16 rounded-md px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1"
              style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
          </label>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Alert if above
            <input type="text" value={editAlertMax} onChange={(e) => setEditAlertMax(e.target.value)}
              placeholder="—" className="w-16 rounded-md px-1.5 py-0.5 text-xs font-mono focus:outline-none focus:ring-1"
              style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
          </label>
        </div>
      )}

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-5 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Current</div>
          <div className="mt-0.5 text-lg font-semibold data-value" style={{ color: 'var(--color-text-primary)' }}>{current?.toFixed(2) ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Previous</div>
          <div className="mt-0.5 text-sm data-value" style={{ color: 'var(--color-text-secondary)' }}>{previous?.toFixed(2) ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Min</div>
          <div className="mt-0.5 text-sm data-value" style={{ color: 'var(--color-text-secondary)' }}>{min?.toFixed(2) ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Max</div>
          <div className="mt-0.5 text-sm data-value" style={{ color: 'var(--color-text-secondary)' }}>{max?.toFixed(2) ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Avg</div>
          <div className="mt-0.5 text-sm data-value" style={{ color: 'var(--color-text-secondary)' }}>{avg?.toFixed(2) ?? "—"}</div>
        </div>
      </div>

      {/* Chart */}
      {values.length > 0 ? (
        <div ref={chartContainerRef} className="w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }} />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-tertiary)' }}>
          No data yet — click "Scrape Now" to start tracking
        </div>
      )}

      {/* History table */}
      {history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
            History ({history.length} snapshots)
          </summary>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: 'var(--color-text-tertiary)' }}>
                  <th className="px-3 py-1.5 font-medium">Value</th>
                  <th className="px-3 py-1.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-1.5 data-value font-medium" style={{ color: 'var(--color-text-primary)' }}>{h.value}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(h.scrapedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

// ── Text / Boolean Field Card ──

function TextFieldCard({ field, scrapeError }: { field: Field; scrapeError?: string }) {
  const { data: history = [] } = useFieldHistory(field.id, 100);
  const updateField = useUpdateField();
  const deleteField = useDeleteField();
  const [editing, setEditing] = useState(false);

  const [editLabel, setEditLabel] = useState(field.label);
  const [editSelector, setEditSelector] = useState(field.cssSelector);
  const [editAttr, setEditAttr] = useState(field.attribute);
  const [editType, setEditType] = useState(field.valueType);
  const [editNotify, setEditNotify] = useState(field.notifyOnChange);

  const saveEdit = () => {
    updateField.mutate({
      fieldId: field.id,
      label: editLabel,
      cssSelector: editSelector,
      attribute: editAttr as any,
      valueType: editType as any,
      notifyOnChange: editNotify,
    });
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Delete field "${field.label}"?`)) {
      deleteField.mutate({ fieldId: field.id });
    }
  };

  // Detect changes — show only transitions
  const changes = history.filter((h, i, arr) => i === 0 || h.value !== arr[i - 1].value);
  const isTruthy = changes[0]?.value === "true" || changes[0]?.value === "in stock";

  // Diff: show previous vs current
  const latest = changes[0]?.value ?? null;
  const previous = changes[1]?.value ?? null;
  const hasChanged = latest !== null && previous !== null && latest !== previous;

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg)', color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }} className="p-4">
      {/* Header with actions */}
      <div className="mb-3 flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
              className="min-w-0 flex-1 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1"
              style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
            <input type="text" value={editSelector} onChange={(e) => setEditSelector(e.target.value)}
              className="min-w-0 flex-[2] rounded-md px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1"
              style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
             <select value={editAttr} onChange={(e) => setEditAttr(e.target.value)}
               className="rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1"
               style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}>
               <option value="text" style={{ background: 'var(--color-surface)' }}>Text</option>
               <option value="href" style={{ background: 'var(--color-surface)' }}>Link</option>
               <option value="src" style={{ background: 'var(--color-surface)' }}>Image</option>
             </select>
             <select value={editType} onChange={(e) => setEditType(e.target.value)}
               className="rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1"
               style={{ ...inputStyle, '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}>
               <option value="number" style={{ background: 'var(--color-surface)' }}>Number</option>
               <option value="text" style={{ background: 'var(--color-surface)' }}>Text</option>
               <option value="boolean" style={{ background: 'var(--color-surface)' }}>Boolean</option>
             </select>
             <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={editNotify} onChange={(e) => setEditNotify(e.target.checked)}
                className="rounded" style={{ accentColor: 'var(--color-accent)' }} />
              Notify
            </label>
            <button onClick={saveEdit} style={{ color: 'var(--color-accent)' }}
              className="rounded-md px-2 py-1 text-xs font-semibold">Save</button>
            <button onClick={() => setEditing(false)} style={{ color: 'var(--color-text-tertiary)' }}
              className="rounded-md px-2 py-1 text-xs">Cancel</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{field.label}</h3>
              {field.valueType === "boolean" && (
                <span className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: isTruthy ? 'var(--color-success)' : 'var(--color-text-tertiary)' }} />
              )}
              {hasChanged && <span className="chip text-[10px]" style={{ color: 'var(--color-accent)' }}>Changed</span>}
              {field.notifyOnChange && <span className="chip text-[10px]" style={{ color: 'var(--color-accent)' }}>🔔</span>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="data-value shrink-0 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{field.cssSelector}</span>
              <button onClick={() => {
                setEditLabel(field.label); setEditSelector(field.cssSelector);
                setEditAttr(field.attribute); setEditType(field.valueType);
                setEditNotify(field.notifyOnChange);
                setEditing(true);
              }} className="rounded p-0.5 transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9.5 1.5l2 2L4 11H2V9l7.5-7.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={handleDelete} className="rounded p-0.5 transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M9.5 3v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scrape error banner */}
      {scrapeError && (
        <div className="mb-3 flex items-start gap-2 rounded-lg p-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 4.5v3M7 9.5v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span>{scrapeError}</span>
        </div>
      )}

      {/* Diff view */}
      {latest !== null && previous !== null && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Previous</div>
            <div className="mt-0.5 break-words text-sm data-value" style={{ color: 'var(--color-text-secondary)' }}>{previous}</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ border: hasChanged ? '1px solid var(--color-accent)' : 'none', background: hasChanged ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: hasChanged ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
              Current {hasChanged && "✦"}
            </div>
            <div className="mt-0.5 break-words text-sm font-medium data-value" style={{ color: hasChanged ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{latest}</div>
          </div>
        </div>
      )}

      {latest !== null && previous === null && (
        <div className="mb-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Current</div>
          <div className="mt-0.5 break-words text-sm font-medium data-value" style={{ color: 'var(--color-text-primary)' }}>{latest}</div>
        </div>
      )}

      {/* Change history */}
      {changes.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-xs transition-colors" style={{ color: 'var(--color-text-tertiary)' }}>
            Changes ({changes.length})
          </summary>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: 'var(--color-text-tertiary)' }}>
                  <th className="px-3 py-1.5 font-medium">Value</th>
                  <th className="px-3 py-1.5 font-medium">Detected</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((h) => (
                  <tr key={h.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td className="px-3 py-1.5 break-all data-value font-medium" style={{ color: 'var(--color-text-primary)' }}>{h.value}</td>
                    <td className="whitespace-nowrap px-3 py-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {formatRelativeTime(new Date(h.scrapedAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : (
        <div className="flex h-16 items-center justify-center rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-tertiary)' }}>
          No data yet — click "Scrape Now" to start tracking
        </div>
      )}
    </section>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
