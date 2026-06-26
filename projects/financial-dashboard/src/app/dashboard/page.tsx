"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearchSymbol } from "@/lib/hooks/useSearch";
import { useTrackedSymbols } from "@/lib/hooks/useStockData";
import { useAddSymbol, useRemoveSymbol } from "@/lib/hooks/useDashboard";
import { normalizeType } from "@/lib/finance/finnhub";

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input — wait 2s after typing stops, trim to deduplicate
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setDebouncedQuery("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useSearchSymbol(debouncedQuery);
  const { data: trackedSymbols = [] } = useTrackedSymbols();
  const addSymbol = useAddSymbol();
  const removeSymbol = useRemoveSymbol();

  const handleAddSymbol = useCallback(
    async (symbol: string, name: string, type: string) => {
      await addSymbol.mutateAsync({ symbol, name, type: normalizeType(type) });
      setSearchQuery("");
    },
    [addSymbol],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Search and track stocks, ETFs, and funds
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbols (e.g. AAPL, VOO, MSFT)..."
            className="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Debounce progress bar — fills over 2s, resets on each keystroke */}
          {searchQuery.trim().length >= 2 && debouncedQuery !== searchQuery.trim() && (
            <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-lg">
              <div
                key={searchQuery.length + searchQuery.slice(-1)}
                className="h-full animate-debounce bg-blue-500"
              />
            </div>
          )}

          {/* Spinner while fetching */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
            </div>
          )}
        </div>

        {searchQuery.trim().length >= 2 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg dark:bg-zinc-900">
            {isSearching && (
              <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
            )}

            {searchResults?.result && searchResults.result.length === 0 && !isSearching && (
              <div className="px-4 py-3 text-sm text-zinc-500">No results found</div>
            )}

            {searchResults?.result?.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleAddSymbol(result.symbol, result.description, result.type)}
                disabled={addSymbol.isPending}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <div>
                  <span className="font-medium">{result.symbol}</span>
                  <span className="ml-2 text-zinc-500">{result.description}</span>
                </div>
                <span className="text-xs text-zinc-400">{result.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tracked symbols */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Tracked Symbols</h2>

        {trackedSymbols.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
            Search and add a symbol above to start tracking
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trackedSymbols.map((symbol) => (
              <div
                key={symbol.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <button
                  onClick={() => router.push(`/dashboard/${symbol.symbol}`)}
                  className="text-left"
                >
                  <div className="font-semibold">{symbol.symbol}</div>
                  <div className="text-sm text-zinc-500">{symbol.name}</div>
                </button>

                <button
                  onClick={() => removeSymbol.mutate({ id: symbol.id })}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
