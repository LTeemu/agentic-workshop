import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useToast } from "@/lib/toast";

export function useTrend(symbol: string, enabled?: boolean) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.analysis.getTrend.queryOptions({ symbol }),
    enabled: enabled ?? symbol.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes — live data
  });
}

export function useMomentum(symbol: string, enabled?: boolean) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.analysis.getMomentum.queryOptions({ symbol }),
    enabled: enabled ?? symbol.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes — live data
  });
}

export function useProjection(symbol: string, enabled?: boolean) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.analysis.getProjection.queryOptions({ symbol }),
    enabled: enabled ?? symbol.length > 0,
    staleTime: 1000 * 60, // 1 minute — matches quote freshness
  });
}

export function useAddSymbol() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.stocks.addSymbol.mutationOptions(),
    onSuccess: (_data, vars) => {
      showToast(`${vars.symbol} added`, "success");
      void queryClient.invalidateQueries({ queryKey: trpc.stocks.getTracked.queryKey() });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to add symbol";
      showToast(msg, "error");
    },
  });
}

export function useRemoveSymbol() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    ...trpc.stocks.removeSymbol.mutationOptions(),
    onSuccess: () => {
      showToast("Symbol removed", "success");
      void queryClient.invalidateQueries({ queryKey: trpc.stocks.getTracked.queryKey() });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to remove symbol";
      showToast(msg, "error");
    },
  });
}


