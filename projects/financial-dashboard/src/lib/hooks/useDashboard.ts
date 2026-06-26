import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useTrend(symbol: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.analysis.getTrend.queryOptions({ symbol }),
    enabled: symbol.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes — live data
  });
}

export function useMomentum(symbol: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.analysis.getMomentum.queryOptions({ symbol }),
    enabled: symbol.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes — live data
  });
}

export function useProjection(symbol: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.analysis.getProjection.queryOptions({ symbol }),
    enabled: symbol.length > 0,
    staleTime: 1000 * 60, // 1 minute — matches quote freshness
  });
}

export function useAddSymbol() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.stocks.addSymbol.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.stocks.getTracked.queryKey() });
    },
  });
}

export function useRemoveSymbol() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    ...trpc.stocks.removeSymbol.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.stocks.getTracked.queryKey() });
    },
  });
}

export function useRefreshSymbol() {
  const trpc = useTRPC();

  return useMutation({
    ...trpc.stocks.refresh.mutationOptions(),
  });
}
