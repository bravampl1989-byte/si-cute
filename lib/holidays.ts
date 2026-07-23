import { sql } from "drizzle-orm";

import { client, db } from "@/lib/db/client";

export type HolidayDate = { date: string; label: string };

let holidaysTableReady: Promise<void> | undefined;

export async function ensureHolidaysTable() {
  holidaysTableReady ??= client.execute(`
    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).then(() => undefined).catch((error) => {
    holidaysTableReady = undefined;
    throw error;
  });
  await holidaysTableReady;
}

function getJakartaYear() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  );
}

// Holiday dates apply only to their calendar year. Old records are removed on
// the first request in a new year, and by the annual Vercel cron at 00.01 WIB.
export async function removeExpiredHolidays(year = getJakartaYear()) {
  await ensureHolidaysTable();
  await db.run(sql`DELETE FROM holidays WHERE date < ${`${year}-01-01`}`);
}

export async function getHolidayDates() {
  await ensureHolidaysTable();
  await removeExpiredHolidays();
  const rows = await db.all<HolidayDate>(sql`
    SELECT date, label FROM holidays ORDER BY date ASC
  `);
  return rows;
}

export async function getWorkingDays(startDate: string, endDate: string) {
  const holidays = await getHolidayDates();
  const holidaySet = new Set(holidays.map((holiday) => holiday.date));
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let days = 0;
  for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const iso = date.toISOString().slice(0, 10);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) days += 1;
  }
  return days;
}
