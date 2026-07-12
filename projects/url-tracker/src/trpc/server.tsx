import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { db } from "@/server/db";
import { makeQueryClient } from "./query-client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "./context";

export const getQueryClient = cache(makeQueryClient);

/** Server-side context — no headers available, minimal context for prefetching */
const serverContext: Context = { db, userId: null };

export const trpc = createTRPCOptionsProxy({
  ctx: serverContext,
  router: appRouter,
  queryClient: getQueryClient,
});
