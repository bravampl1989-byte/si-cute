import { NextResponse } from "next/server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { ensureHolidaysTable, getHolidayDates, type HolidayDate } from "@/lib/holidays";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ holidays: await getHolidayDates() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tanggal libur belum bisa dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { holidays?: HolidayDate[] };
    const holidays = Array.from(
      new Map(
        (body.holidays ?? [])
          .filter((holiday) => /^\d{4}-\d{2}-\d{2}$/.test(holiday.date))
          .map((holiday) => [holiday.date, {
            date: holiday.date,
            label: holiday.label.trim().slice(0, 120) || "Libur",
          }]),
      ).values(),
    );
    await ensureHolidaysTable();
    await db.run(sql`DELETE FROM holidays`);
    for (const holiday of holidays) {
      await db.run(sql`
        INSERT INTO holidays (date, label) VALUES (${holiday.date}, ${holiday.label})
      `);
    }
    return NextResponse.json({ holidays: await getHolidayDates() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tanggal libur belum bisa disimpan." },
      { status: 500 },
    );
  }
}
