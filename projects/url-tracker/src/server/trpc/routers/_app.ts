import { router } from "@/trpc/init";
import { pagesRouter } from "./pages";

export const appRouter = router({
  pages: pagesRouter,
});

export type AppRouter = typeof appRouter;
