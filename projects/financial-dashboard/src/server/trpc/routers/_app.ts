import { router } from "@/trpc/init";
import { stocksRouter } from "./stocks";
import { analysisRouter } from "./analysis";

export const appRouter = router({
  stocks: stocksRouter,
  analysis: analysisRouter,
});

export type AppRouter = typeof appRouter;
