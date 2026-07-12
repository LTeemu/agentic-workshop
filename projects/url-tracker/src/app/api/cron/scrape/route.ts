import { createTRPCContext } from "@/trpc/context";
import { createCallerFactory } from "@/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";

const createCaller = createCallerFactory(appRouter);

/**
 * Cron endpoint for scheduled scraping.
 *
 * Call this every 15 minutes from an external cron service (cron-job.org, Vercel Cron, etc.).
 * It will scrape all pages with `hourly` or `daily` intervals that are due.
 */
export async function GET() {
  try {
    const ctx = await createTRPCContext({ headers: new Headers() });
    const caller = createCaller(ctx);
    const results = await caller.pages.scrapeScheduledPages();

    return Response.json({ ok: true, results });
  } catch (err) {
    console.error("Cron scrape error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
