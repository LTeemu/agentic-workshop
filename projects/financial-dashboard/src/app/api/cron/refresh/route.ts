import { db } from "@/server/db";
import { trackedSymbols, dataFreshness } from "@/server/db/schema/index";
import { sql } from "drizzle-orm";

/**
 * Cron endpoint to refresh all tracked symbols' data freshness.
 * Call via external cron service or Vercel Cron Jobs.
 * Protect with CRON_SECRET in production.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const symbols = await db.select({ symbol: trackedSymbols.symbol }).from(trackedSymbols);
    const results: Array<{ symbol: string; status: string }> = [];

    for (const { symbol } of symbols) {
      try {
        await db
          .insert(dataFreshness)
          .values({ symbol, dataType: "candles" })
          .onConflictDoUpdate({
            target: [dataFreshness.symbol, dataFreshness.dataType],
            set: { lastFetchedAt: sql`now()` },
          });

        results.push({ symbol, status: "ok" });
      } catch (err) {
        results.push({ symbol, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
      }
    }

    return Response.json({ ok: true, results });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 },
    );
  }
}
