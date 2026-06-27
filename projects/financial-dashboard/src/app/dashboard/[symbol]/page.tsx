"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuote, useStockProfile, useNews } from "@/lib/hooks/useStockData";
import { useTrend, useMomentum, useProjection } from "@/lib/hooks/useDashboard";
import { KpiCards } from "./components/kpi-cards";
import { ProjectionPanel } from "./components/projection-panel";
import { NewsFeed } from "./components/news-feed";
import { Fundamentals } from "./components/fundamentals";
import { CacheIndicator } from "./components/cache-indicator";
import { isRestrictedSymbol } from "@/lib/finance/finnhub";

// Session-level cache: once a symbol returns 403, skip future quote calls
const blockedCache = new Set<string>();

export default function SymbolPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol.toUpperCase();

  // Proactively block known-restricted exchanges (no API call wasted)
  const proactivelyBlocked = isRestrictedSymbol(symbol) || blockedCache.has(symbol);

  const {
    data: quote,
    isLoading: quoteLoading,
    dataUpdatedAt: quoteUpdatedAt,
    error: quoteError,
  } = useQuote(symbol, !proactivelyBlocked);

  // On 403, add to session cache so re-visits don't re-fetch
  const added = useRef(false);
  useEffect(() => {
    if (quoteError?.message?.includes("free plan") && !added.current) {
      blockedCache.add(symbol);
      added.current = true;
    }
  }, [quoteError, symbol]);

  // If proactively blocked, treat as blocked immediately without waiting for API
  const isBlocked = proactivelyBlocked || (quoteError?.message?.includes("free plan") ?? false);

  // Don't fire dependent queries until quote has settled (success or error)
  const enableDependents = !quoteLoading && !isBlocked;

  const {
    data: profile,
    isLoading: profileLoading,
    dataUpdatedAt: profileUpdatedAt,
    error: profileError,
  } = useStockProfile(symbol, enableDependents);
  const { data: trend, dataUpdatedAt: trendUpdatedAt, error: trendError } = useTrend(symbol, enableDependents);
  const { data: momentum, dataUpdatedAt: momentumUpdatedAt } = useMomentum(symbol, enableDependents);
  const { data: projection, dataUpdatedAt: projectionUpdatedAt, error: projectionError } = useProjection(symbol, enableDependents);
  const { data: news = [], dataUpdatedAt: newsUpdatedAt, error: newsError } = useNews(symbol, undefined, enableDependents);

  if (quoteLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading data for {symbol}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Blocked-symbol banner */}
      {isBlocked && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{symbol}</strong> is not available on the free plan (US only). A paid Finnhub subscription is required for global markets.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold">{symbol}</h1>
        {profile && "name" in profile && (
          <p className="text-sm text-zinc-500">{profile.name} — {profile.exchange}</p>
        )}
      </div>

      {/* KPI Cards */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Live Quote</h2>
          <CacheIndicator label="Quote" updatedAt={quoteUpdatedAt} staleAfter={60_000} />
        </div>
        {isBlocked ? (
          <p className="text-sm text-zinc-400">Not available for this symbol.</p>
        ) : quoteError ? (
          <p className="text-sm text-red-600">{quoteError.message}</p>
        ) : (
          <KpiCards quote={quote} />
        )}
      </div>
      {momentum && !isBlocked && (
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Analysis</h2>
            <CacheIndicator label="Analysis" updatedAt={trendUpdatedAt} staleAfter={120_000} />
          </div>
          {trendError && (
            <p className="mb-2 text-sm text-red-600">{trendError.message}</p>
          )}
        <div className="flex flex-wrap gap-4 text-sm">
          {momentum.marketCap && (
            <span className="rounded-lg border px-3 py-1.5">
              Market Cap: <strong>{momentum.marketCap}</strong>
            </span>
          )}
          {momentum.industry && (
            <span className="rounded-lg border px-3 py-1.5">
              Industry: <strong>{momentum.industry}</strong>
            </span>
          )}
        </div>
        </div>
      )}

      {/* Projection + Metadata row */}
      {!isBlocked && (
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Intraday Projection</h2>
            <CacheIndicator label="Projection" updatedAt={projectionUpdatedAt} staleAfter={60_000} />
          </div>
          {projectionError ? (
            <p className="text-sm text-red-600">{projectionError.message}</p>
          ) : (
            <ProjectionPanel projection={projection} />
          )}
        </div>
      </div>
      )}

      {/* News / Fundamentals grid */}
      {isBlocked ? (
        <p className="text-sm text-zinc-400">News and fundamentals are not available for this symbol.</p>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <NewsFeed news={news} newsUpdatedAt={newsUpdatedAt} newsError={newsError} />
        <Fundamentals profile={profile} profileLoading={profileLoading} symbol={symbol} profileUpdatedAt={profileUpdatedAt} profileError={profileError} />
      </div>
      )}
    </div>
  );
}
