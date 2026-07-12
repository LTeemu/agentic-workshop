"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTrackedPages, useScrapeAllPages, useRemovePage } from "@/lib/hooks/usePages";

function parseFolderId(param: string | null): number | "uncategorized" | undefined {
  if (param === null) return undefined; // all pages
  if (param === "uncategorized") return "uncategorized";
  const n = Number(param);
  return Number.isFinite(n) ? n : undefined;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-7 w-32 rounded" style={{ background: 'var(--color-surface)' }} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="animate-pulse p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md" style={{ background: 'var(--color-border)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded" style={{ background: 'var(--color-border)' }} />
                  <div className="h-2.5 w-1/2 rounded" style={{ background: 'var(--color-border)' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function useDelayedPending(isPending: boolean, delayMs = 150): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isPending, delayMs]);

  return show;
}

export default function DashboardClient({ folderParam }: { folderParam: string | null }) {
  const router = useRouter();
  const folderId = parseFolderId(folderParam);

  const { data: pages = [], isPending } = useTrackedPages(
    folderId === "uncategorized" ? null : folderId,
  );
  const showSkeleton = useDelayedPending(isPending);
  const scrapeAll = useScrapeAllPages();
  const removePage = useRemovePage();

  const title =
    folderParam === null
      ? "All Pages"
      : folderParam === "uncategorized"
        ? "Uncategorized"
        : `Folder`;

  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    transition: 'all 0.15s',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrapeAll.mutate()}
            disabled={scrapeAll.isPending || pages.length === 0}
            style={{ ...btnBase, border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            className="disabled:opacity-40"
          >
            <svg
              className={scrapeAll.isPending ? "animate-spin" : ""}
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
            >
              <path d="M11.5 6.5a5 5 0 11-5-5M11.5 1.5v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh All
          </button>
          <button
            onClick={() => router.push("/dashboard/add")}
            style={{ ...btnBase, background: 'var(--color-accent)', color: '#0c0c0f' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add Page
          </button>
        </div>
      </div>

      {/* Loading — delayed skeleton to avoid flash for fast queries */}
      {showSkeleton && <PageSkeleton />}

      {/* Empty state */}
      {!isPending && pages.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-xl p-12 text-center"
          style={{ border: '1px dashed var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: 'var(--color-accent-subtle)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-accent)' }}>
              <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 13h6M9 16h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {folderParam === "uncategorized"
              ? "No uncategorized pages"
              : "No pages yet"}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {folderParam === "uncategorized"
              ? "Move pages here or add a new one"
              : "Add a URL to start tracking data from any web page"}
          </p>
          <button
            onClick={() => router.push("/dashboard/add")}
            className="mt-5"
            style={{ ...btnBase, background: 'var(--color-accent)', color: '#0c0c0f' }}
          >
            Add your first page
          </button>
        </div>
      )}

      {/* Page grid */}
      {!isPending && pages.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {pages.map((page) => {
            const domain = new URL(page.url).hostname.replace(/^www\./, "");
            const lastScraped = page.lastScrapedAt
              ? formatRelativeTime(new Date(page.lastScrapedAt))
              : null;

            const numericFields = page.fields.filter((f) => f.valueType === "number" && f.latestValue !== null);
            const primaryField = numericFields[0];

            return (
              <div
                key={page.id}
                className="group relative cursor-pointer rounded-xl transition-all"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onClick={() => router.push(`/dashboard/${page.id}`)}
              >
                <div className="flex flex-col gap-2.5 p-4">
                  {/* Thumbnail + name */}
                  <div className="flex items-center gap-3">
                    {page.imageUrl ? (
                      <img src={page.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--color-accent-subtle)' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-accent)' }}>
                          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M1 6h14M6 1v14" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{page.name || domain}</div>
                      <div className="truncate text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{domain}</div>
                    </div>
                  </div>

                  {/* Primary numeric value */}
                  {primaryField && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>{primaryField.label}</div>
                      <div className="mt-0.5 text-xl font-semibold data-value" style={{ color: 'var(--color-text-primary)' }}>
                        {primaryField.latestValue}
                      </div>
                    </div>
                  )}

                  {/* Field chips */}
                  {page.fields.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {page.fields.slice(0, 4).map((f) => (
                        <span key={f.id} className="chip">
                          {f.label}
                        </span>
                      ))}
                      {page.fields.length > 4 && (
                        <span className="chip" style={{ opacity: 0.6 }}>
                          +{page.fields.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Last scraped */}
                  <div className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {lastScraped ? `Scraped ${lastScraped}` : "Not yet scraped"}
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove "${page.name || page.url}"?`)) {
                      removePage.mutate({ pageId: page.id });
                    }
                  }}
                  className="absolute right-2 top-2 hidden rounded-md p-1 group-hover:block"
                  style={{ color: 'var(--color-text-tertiary)' }}
                  title="Remove page"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 2.5l8 8M10.5 2.5l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  return `${days}d ago`;
}
