import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyToken } from "@clerk/backend";
import { env } from "./lib/env.js";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  userId: string | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const authHeader = opts.req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let userId: string | null = null;
  if (token) {
    try {
      const payload = await verifyToken(token, {
        secretKey: env.clerkSecretKey,
      });
      userId = payload.sub;
    } catch {
      // Invalid or expired token — treat the request as signed out rather
      // than throwing here, so publicQuery procedures still work.
      userId = null;
    }
  }

  return { req: opts.req, resHeaders: opts.resHeaders, userId };
}
