"use client";

import { useEffect, useState } from "react";

interface CacheIndicatorProps {
  /** Unix ms timestamp of when data was fetched */
  updatedAt: number | undefined;
  /** staleTime in ms */
  staleAfter: number;
  /** Label for what data this is (e.g. "Quote", "News") */
  label: string;
}

export function CacheIndicator({ updatedAt, staleAfter, label }: CacheIndicatorProps) {
  if (!updatedAt) return null;

  const [now, setNow] = useState(Date.now());

  // Re-render every 30s to keep times accurate
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - updatedAt;
  const remaining = staleAfter - elapsed;
  const isStale = remaining <= 0;

  const ago = formatDuration(elapsed);
  const next = isStale ? "now" : `in ${formatDuration(remaining)}`;

  return (
    <span className="text-[10px] text-zinc-400" title={`${label}: fetched ${ago} ago, refreshes ${next}`}>
      {label} <span className={isStale ? "text-amber-500" : ""}>·</span> {ago} ago
    </span>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
