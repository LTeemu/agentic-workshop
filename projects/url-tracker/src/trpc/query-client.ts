import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 min — overridden per-query; safety net for new queries
        gcTime: 1000 * 60 * 30, // 30 min garbage collection
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
}
