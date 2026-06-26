"use client";

import { useParams } from "next/navigation";
import { useQuote, useStockProfile, useNews } from "@/lib/hooks/useStockData";
import { useTrend, useMomentum, useProjection } from "@/lib/hooks/useDashboard";
import { KpiCards } from "./components/kpi-cards";
import { ProjectionPanel } from "./components/projection-panel";
import { NewsFeed } from "./components/news-feed";
import { Fundamentals } from "./components/fundamentals";
import { CacheIndicator } from "./components/cache-indicator";

export default function SymbolPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol.toUpperCase();

  const {
    data: quote,
    isLoading: quoteLoading,
    dataUpdatedAt: quoteUpdatedAt,
  } = useQuote(symbol);
  const {
    data: profile,
    isLoading: profileLoading,
    dataUpdatedAt: profileUpdatedAt,
  } = useStockProfile(symbol);
  const { data: trend, dataUpdatedAt: trendUpdatedAt } = useTrend(symbol);
  const { data: momentum, dataUpdatedAt: momentumUpdatedAt } = useMomentum(symbol);
  const { data: projection, dataUpdatedAt: projectionUpdatedAt } = useProjection(symbol);
  const { data: news = [], dataUpdatedAt: newsUpdatedAt } = useNews(symbol);

  if (quoteLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading data for {symbol}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{symbol}</h1>
          <div className="flex gap-3">
            <CacheIndicator label="Quote" updatedAt={quoteUpdatedAt} staleAfter={60_000} />
            <CacheIndicator label="Profile" updatedAt={profileUpdatedAt} staleAfter={86_400_000} />
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          {profile && "name" in profile && (
            <p className="text-sm text-zinc-500">{profile.name} — {profile.exchange}</p>
          )}
          <div className="flex gap-3">
            <CacheIndicator label="Analysis" updatedAt={trendUpdatedAt} staleAfter={120_000} />
            <CacheIndicator label="News" updatedAt={newsUpdatedAt} staleAfter={3_600_000} />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards quote={quote} />
      {momentum && (
        <div className="flex gap-4 text-sm">
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
      )}

      {/* Projection + Metadata row */}
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Intraday Projection</h2>
            <CacheIndicator label="Projection" updatedAt={projectionUpdatedAt} staleAfter={60_000} />
          </div>
          <ProjectionPanel projection={projection} />
        </div>
      </div>

      {/* News / Fundamentals grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <NewsFeed news={news} />
        <Fundamentals profile={profile} profileLoading={profileLoading} symbol={symbol} />
      </div>
    </div>
  );
}
