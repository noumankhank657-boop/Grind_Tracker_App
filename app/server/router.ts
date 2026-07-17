import { createRouter, publicQuery } from "./middleware.js";
import { trackerRouter } from "./trackerRouter.js";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  tracker: trackerRouter,
});

export type AppRouter = typeof appRouter;
