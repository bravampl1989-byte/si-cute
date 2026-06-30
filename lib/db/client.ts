import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("TURSO_DATABASE_URL is required");
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
