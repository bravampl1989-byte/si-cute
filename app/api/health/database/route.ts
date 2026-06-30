import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const result = await db.run(sql`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM leave_quotas) AS leave_quotas,
        (SELECT COUNT(*) FROM leave_requests) AS leave_requests,
        (SELECT COUNT(*) FROM approvals) AS approvals,
        (SELECT COUNT(*) FROM whatsapp_logs) AS whatsapp_logs
    `);
    const counts = result.rows[0];

    return NextResponse.json({
      ok: true,
      database: process.env.TURSO_DATABASE_URL?.startsWith("file:")
        ? "local-libsql"
        : "turso",
      counts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Database error",
      },
      { status: 500 },
    );
  }
}
