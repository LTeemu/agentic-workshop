import { z } from "zod";
import { router, publicProcedure } from "@/trpc/init";
import { getQuote, getProfile } from "@/lib/finance/finnhub";

export const analysisRouter = router({
  /** Day analysis from current quote data */
  getTrend: publicProcedure
    .input(z.object({ symbol: z.string().toUpperCase() }))
    .query(async ({ input }) => {
      const quote = await getQuote(input.symbol);

      const direction = quote.dp > 0.5 ? "up" : quote.dp < -0.5 ? "down" : "sideways";

      // Confidence based on how decisive the move is
      const confidence = Math.min(Math.abs(quote.dp) / 3, 1);

      return { direction, confidence };
    }),

  /** Intraday projection based on current quote momentum */
  getProjection: publicProcedure
    .input(z.object({ symbol: z.string().toUpperCase() }))
    .query(async ({ input }) => {
      const quote = await getQuote(input.symbol);

      const dayRange = quote.h - quote.l;
      const rangeUsed = dayRange > 0 ? (quote.c - quote.l) / dayRange : 0.5;
      const momentumStrength = Math.min(Math.abs(quote.dp) / 5, 1);

      // Projection: continue current momentum toward the remaining range extreme
      const isUp = quote.dp >= 0;
      const remaining = isUp ? quote.h - quote.c : quote.c - quote.l;
      const projectedMove = remaining * momentumStrength;
      const projectedPrice = isUp ? quote.c + projectedMove : quote.c - projectedMove;

      // Determine signal clarity
      const signal =
        quote.dp > 1 ? "bullish" : quote.dp < -1 ? "bearish" : "neutral";

      // Estimate when we might reach the target (rough: based on how much range was used)
      const progress = isUp ? rangeUsed : 1 - rangeUsed;
      const estimatedDays = progress > 0.5 ? 1 : 2;

      return {
        currentPrice: quote.c,
        projectedPrice,
        dayHigh: quote.h,
        dayLow: quote.l,
        signal,
        confidence: Math.round(momentumStrength * 100),
        rangeUsed: Math.round(rangeUsed * 100),
        estimatedDays,
      };
    }),

  /** Fundamental momentum from profile data */
  getMomentum: publicProcedure
    .input(z.object({ symbol: z.string().toUpperCase() }))
    .query(async ({ input }) => {
      const [quote, profile] = await Promise.all([
        getQuote(input.symbol),
        getProfile(input.symbol),
      ]);

      const marketCap = "marketCapitalization" in profile ? profile.marketCapitalization : 0;

      // Score: positive/negative daily change weighted by market cap size
      const size = marketCap > 0 ? Math.min(marketCap / 1_000_000_000_000, 1) : 0;
      const score = quote.dp / Math.max(1 - size, 0.5);

      return {
        score,
        marketCap: marketCap > 0 ? formatMarketCap(marketCap) : null,
        industry: "industry" in profile ? profile.industry : null,
      };
    }),
});

function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000_000_000) return `${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `${(cap / 1_000_000).toFixed(2)}M`;
  return `${cap.toFixed(0)}`;
}
