import { handle } from "hono/vercel";
import { app } from "../server/app";

// No `config.runtime` here on purpose: Node.js is the default runtime for
// Vercel functions, and this app needs it (mysql2 needs a real TCP/TLS
// socket, which isn't available on the Edge runtime).

export default handle(app);
