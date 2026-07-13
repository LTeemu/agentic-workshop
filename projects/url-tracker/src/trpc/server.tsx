import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { db } from "@/server/db";
import { makeQueryClient } from "./query-client";
import { appRouter } from "@/server/trpc/routers/_app";
import type { Context } from "./context";

export const getQueryClient = cache(makeQueryClient);

/** Minimal context for server-side prefetching (RSC). userId is null because
 *  prefetch happens before authentication is known — queries that need the user
 *  will return empty/default data. */
const serverContext: Context = { db, userId: null };

export const trpc = createTRPCOptionsProxy({
  ctx: serverContext,
  router: appRouter,
  queryClient: getQueryClient,
});
