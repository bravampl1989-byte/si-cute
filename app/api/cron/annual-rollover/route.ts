import { NextResponse } from "next/server";

import { ensureAnnualQuotaRollover } from "@/lib/annual-rollover";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";

export const dynamic = "force-dynamic";

// Vercel sends GET requests to configured cron paths. Set CRON_SECRET in
// Vercel so only Vercel's scheduled request can invoke this endpoint.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const applied = await ensureAnnualQuotaRollover();
    if (applied) invalidateDashboardCache();
    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rollover tahunan gagal." },
      { status: 500 },
    );
  }
}
