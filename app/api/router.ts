import { createRouter, publicQuery } from "./middleware";
import { trackerRouter } from "./trackerRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  tracker: trackerRouter,
});

export type AppRouter = typeof appRouter;
