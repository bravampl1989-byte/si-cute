import { client } from "@/lib/db/client";

export const nonAnnualLeaveTypes = [
  "besar",
  "sakit",
  "melahirkan",
  "alasan_penting",
  "di_luar_tanggungan_negara",
] as const;

export type NonAnnualLeaveType = (typeof nonAnnualLeaveTypes)[number];

let ready: Promise<void> | undefined;

export async function ensureEmployeeNonAnnualLeaves() {
  ready ??= client
    .execute(`
      CREATE TABLE IF NOT EXISTS employee_nonannual_leaves (
        nip TEXT NOT NULL,
        jenis_cuti TEXT NOT NULL,
        jumlah_hari INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (nip, jenis_cuti)
      )
    `)
    .then(() => undefined);
  await ready;
}
