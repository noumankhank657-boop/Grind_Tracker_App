import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env.js";

/**
 * 30 mutations per 10 seconds, per signed-in user. Generous enough for real
 * usage (rapid checkbox toggling) but stops scripted abuse.
 *
 * If Upstash isn't configured (e.g. local dev), rate limiting is a no-op
 * rather than crashing the app — don't let it block you locally.
 */
export const ratelimit =
  env.upstashUrl && env.upstashToken
    ? new Ratelimit({
        redis: new Redis({ url: env.upstashUrl, token: env.upstashToken }),
        limiter: Ratelimit.slidingWindow(30, "10 s"),
        analytics: true,
        prefix: "grind-tracker",
      })
    : null;