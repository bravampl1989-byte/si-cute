import { sql } from "drizzle-orm";

import { client, db } from "@/lib/db/client";

const FONNTE_TOKEN_KEY = "fonnte_token";

let runtimeFonnteToken = "";
let settingsTableReady: Promise<void> | undefined;

async function ensureSettingsTable() {
  settingsTableReady ??= client
    .execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .then(() => undefined)
    .catch((error) => {
      settingsTableReady = undefined;
      throw error;
    });

  await settingsTableReady;
}

export function setRuntimeFonnteToken(token: string) {
  runtimeFonnteToken = token.trim();
}

export function clearRuntimeFonnteToken() {
  runtimeFonnteToken = "";
}

export function getRuntimeFonnteToken() {
  return runtimeFonnteToken || undefined;
}

export function hasRuntimeFonnteToken() {
  return runtimeFonnteToken.length > 0;
}

export async function getDatabaseFonnteToken() {
  await ensureSettingsTable();
  const result = await db.run(sql`
    SELECT value
    FROM app_settings
    WHERE key = ${FONNTE_TOKEN_KEY}
    LIMIT 1
  `);
  const token = result.rows[0]?.value;
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

export async function saveDatabaseFonnteToken(token: string) {
  const trimmedToken = token.trim();
  await ensureSettingsTable();
  await db.run(sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${FONNTE_TOKEN_KEY}, ${trimmedToken}, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);
  setRuntimeFonnteToken(trimmedToken);
}

export async function clearDatabaseFonnteToken() {
  await ensureSettingsTable();
  await db.run(sql`
    DELETE FROM app_settings WHERE key = ${FONNTE_TOKEN_KEY}
  `);
  clearRuntimeFonnteToken();
}

export function maskToken(token?: string) {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}${"*".repeat(Math.min(token.length - 8, 16))}${token.slice(-4)}`;
}
