import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import * as Sentry from "@sentry/node";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { env } from "./lib/env.js";

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.isProduction ? "production" : "development",
    tracesSampleRate: 0.1,
  });
}

export const app = new Hono();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError({ error, path }) {
      // Auth and validation failures aren't bugs — don't spam Sentry with them.
      if (error.code !== "UNAUTHORIZED" && error.code !== "BAD_REQUEST") {
        Sentry.captureException(error, { tags: { trpcPath: path } });
      }
      console.error(`tRPC error on ${path}:`, error);
    },
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
