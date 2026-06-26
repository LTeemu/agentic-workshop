import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Search symbols with automatic normalization:
 * - Trims whitespace so "aa  " and "aa" produce the same cache key
 * - Requires at least 2 trimmed characters
 * - 5-minute stale time prevents redundant network calls
 */
export function useSearchSymbol(rawQuery: string) {
  const trpc = useTRPC();
  const query = rawQuery.trim();

  return useQuery({
    ...trpc.stocks.search.queryOptions({ query }),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes for search results
  });
}
