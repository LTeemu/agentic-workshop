"use client";

import { createTRPCContext } from "@trpc/tanstack-react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "./query-client";
import type { AppRouter } from "@/server/trpc/routers/_app";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
