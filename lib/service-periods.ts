import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";

function getJakartaYearMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

// Advances each employee's stored service period once per calendar month.
export async function ensureServicePeriodsCurrent() {
  const targetYearMonth = getJakartaYearMonth();
  const [targetYear, targetMonth] = targetYearMonth.split("-").map(Number);
  const employees = await db.all<{
    nip: string;
    serviceYears: number;
    serviceMonths: number;
    serviceAsOf: string | null;
  }>(sql`
    SELECT nip,
           masa_kerja_tahun AS serviceYears,
           masa_kerja_bulan AS serviceMonths,
           masa_kerja_per AS serviceAsOf
    FROM users
    WHERE aktif = 1
  `);

  let changed = false;
  for (const employee of employees) {
    const match = employee.serviceAsOf?.match(/^(\d{4})-(\d{2})$/);
    if (!match) continue;
    const elapsedMonths =
      (targetYear - Number(match[1])) * 12 + (targetMonth - Number(match[2]));
    if (elapsedMonths <= 0) continue;

    const totalMonths =
      Number(employee.serviceYears) * 12 +
      Number(employee.serviceMonths) +
      elapsedMonths;
    await db.run(sql`
      UPDATE users
      SET masa_kerja_tahun = ${Math.floor(totalMonths / 12)},
          masa_kerja_bulan = ${totalMonths % 12},
          masa_kerja_per = ${targetYearMonth}
      WHERE nip = ${employee.nip}
    `);
    changed = true;
  }
  return changed;
}
