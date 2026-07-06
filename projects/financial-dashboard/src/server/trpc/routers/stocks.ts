import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@/trpc/init";
import { searchSymbol, getProfile, getNews, getQuote } from "@/lib/finance/finnhub";
import { trackedSymbols } from "@/server/db/schema/index";
import { and, eq, desc } from "drizzle-orm";

export const stocksRouter = router({
  /** Search for a stock/ETF/fund by query */
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      return searchSymbol(input.query);
    }),

  /** Get list of tracked symbols for the authenticated user */
  getTracked: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return [];
    return ctx.db
      .select()
      .from(trackedSymbols)
      .where(eq(trackedSymbols.userId, ctx.userId))
      .orderBy(desc(trackedSymbols.addedAt));
  }),

  /** Add a symbol to tracking for the authenticated user */
  addSymbol: publicProcedure
    .input(
      z.object({
        symbol: z.string().toUpperCase(),
        name: z.string().optional(),
        type: z.enum(["stock", "etf", "fund"]).default("stock"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const [tracked] = await ctx.db
        .insert(trackedSymbols)
        .values({ userId: ctx.userId, symbol: input.symbol, name: input.name, type: input.type })
        .onConflictDoNothing()
        .returning();

      return tracked ?? { symbol: input.symbol };
    }),

  /** Remove a tracked symbol owned by the authenticated user */
  removeSymbol: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      await ctx.db
        .delete(trackedSymbols)
        .where(and(eq(trackedSymbols.id, input.id), eq(trackedSymbols.userId, ctx.userId)));
      return { success: true };
    }),

  /** Get real-time quote data for a symbol */
  getQuote: publicProcedure
    .input(z.object({ symbol: z.string().toUpperCase() }))
    .query(async ({ input }) => {
      return getQuote(input.symbol);
    }),

  /** Get company profile */
  getProfile: publicProcedure
    .input(z.object({ symbol: z.string().toUpperCase() }))
    .query(async ({ input }) => {
      return getProfile(input.symbol);
    }),

  /** Get recent news */
  getNews: publicProcedure
    .input(z.object({ symbol: z.string().toUpperCase(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const to = new Date().toISOString().split("T")[0];
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const news = await getNews(input.symbol, from, to);
      return news.slice(0, input.limit);
    }),

});
