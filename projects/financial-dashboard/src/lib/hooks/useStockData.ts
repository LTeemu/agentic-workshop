import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useQuote(symbol: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.stocks.getQuote.queryOptions({ symbol }),
    enabled: symbol.length > 0,
    staleTime: 1000 * 60, // 1 minute — quote data changes fast
  });
}

export function useStockProfile(symbol: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.stocks.getProfile.queryOptions({ symbol }),
    enabled: symbol.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useNews(symbol: string, limit?: number) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.stocks.getNews.queryOptions({ symbol, limit }),
    enabled: symbol.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useTrackedSymbols() {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.stocks.getTracked.queryOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
