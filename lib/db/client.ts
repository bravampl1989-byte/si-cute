import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:/tmp/cutipns.db";

export const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export const isDatabaseConfigured = Boolean(process.env.TURSO_DATABASE_URL);
