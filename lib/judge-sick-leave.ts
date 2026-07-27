import { sql } from "drizzle-orm";

import { client, db } from "@/lib/db/client";

let ready: Promise<void> | undefined;

export function ensureJudgeSickLeaveDetails() {
  ready ??= client
    .execute(`CREATE TABLE IF NOT EXISTS judge_sick_leave_details (
      request_id INTEGER NOT NULL PRIMARY KEY,
      diagnosis TEXT NOT NULL,
      hospital_name TEXT NOT NULL,
      certificate_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES leave_requests(id) ON DELETE CASCADE
    )`)
    .then(() => undefined);
  return ready;
}

export async function saveJudgeSickLeaveDetails(
  requestId: number,
  details: { diagnosis: string; hospitalName: string; certificateDate: string },
) {
  await ensureJudgeSickLeaveDetails();
  await db.run(sql`
    INSERT INTO judge_sick_leave_details
      (request_id, diagnosis, hospital_name, certificate_date)
    VALUES
      (${requestId}, ${details.diagnosis}, ${details.hospitalName}, ${details.certificateDate})
    ON CONFLICT(request_id) DO UPDATE SET
      diagnosis = excluded.diagnosis,
      hospital_name = excluded.hospital_name,
      certificate_date = excluded.certificate_date
  `);
}
