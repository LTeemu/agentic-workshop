"use client";

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

  const elapsed = Date.now() - updatedAt;
  const isStale = elapsed >= staleAfter;

  const time = formatTime(updatedAt);

  return (
    <span
      className="text-[10px] text-zinc-400"
      title={`${label}: fetched at ${time}`}
    >
      {label} <span className={isStale ? "text-amber-500" : ""}>·</span> {time}
    </span>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const seconds = d.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes}:${seconds} ${ampm}`;
}
