import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context.js";
import { ratelimit } from "./lib/ratelimit.js";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

/**
 * Requires a verified Clerk session and enforces a per-user rate limit.
 * ctx.userId is guaranteed non-null inside.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required" });
  }

  if (ratelimit) {
    const { success } = await ratelimit.limit(ctx.userId);
    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests — slow down a little.",
      });
    }
  }

  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
