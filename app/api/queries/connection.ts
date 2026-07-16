import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const url = new URL(connectionString);

const pool = mysql.createPool({
  host: url.hostname,
  port: Number(url.port) || 4000,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.replace("/", ""),
  ssl: {
    rejectUnauthorized: true,
  },
});

const db = drizzle(pool, { schema, mode: "default" });

export function getDb() {
  return db;
}
