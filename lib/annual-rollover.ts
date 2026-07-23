import { sql } from "drizzle-orm";

import { client, db } from "@/lib/db/client";

function getJakartaYear() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
}

async function ensureSettingsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// This is intentionally idempotent. The first SI CUTE request on 1 January
// (Jakarta time) performs the rollover; later requests in the same year do nothing.
export async function ensureAnnualQuotaRollover(year = getJakartaYear()) {
  await ensureSettingsTable();
  const key = `annual_quota_rollover:${year}`;
  const completed = await db.all<{ value: string }>(sql`
    SELECT value FROM app_settings WHERE key = ${key} LIMIT 1
  `);
  if (completed.length) return false;

  // Example in 2027: 2024 expires, 2025 and 2026 are retained at max. 6 days.
  await db.run(sql`DELETE FROM leave_quotas WHERE tahun < ${year - 2}`);
  await db.run(sql`
    UPDATE leave_quotas
    SET sisa_kuota = CASE WHEN sisa_kuota > 6 THEN 6 ELSE sisa_kuota END,
        updated_at = CURRENT_TIMESTAMP
    WHERE tahun IN (${year - 2}, ${year - 1})
  `);

  // Every active employee gets a fresh 12-day current-year quota exactly once.
  await db.run(sql`
    INSERT INTO leave_quotas (nip, tahun, kuota_total, sisa_kuota, sumber, updated_at)
    SELECT u.nip, ${year}, 12, 12, 'tahun_berjalan', CURRENT_TIMESTAMP
    FROM users u
    WHERE u.aktif = 1
      AND NOT EXISTS (
        SELECT 1 FROM leave_quotas quota
        WHERE quota.nip = u.nip
          AND quota.tahun = ${year}
          AND quota.sumber = 'tahun_berjalan'
      )
  `);

  await db.run(sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, 'completed', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  return true;
}
