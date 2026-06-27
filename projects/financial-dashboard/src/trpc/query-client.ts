import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        gcTime: 1000 * 60 * 60 * 48, // 48 hours garbage collection
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  });
}
