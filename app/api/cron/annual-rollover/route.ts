import { NextResponse } from "next/server";

import {
  ensureAnnualQuotaRollover,
  ensureNonAnnualLeaveRollover,
} from "@/lib/annual-rollover";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { ensureFixedNationalHolidays, removeExpiredHolidays } from "@/lib/holidays";

export const dynamic = "force-dynamic";

// Vercel sends GET requests to configured cron paths. Set CRON_SECRET in
// Vercel so only Vercel's scheduled request can invoke this endpoint.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const [annualApplied, nonAnnualApplied] = await Promise.all([
      ensureAnnualQuotaRollover(),
      ensureNonAnnualLeaveRollover(),
    ]);
    await removeExpiredHolidays();
    await ensureFixedNationalHolidays();
    if (annualApplied || nonAnnualApplied) invalidateDashboardCache();
    return NextResponse.json({ ok: true, applied: annualApplied || nonAnnualApplied });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rollover tahunan gagal." },
      { status: 500 },
    );
  }
}
