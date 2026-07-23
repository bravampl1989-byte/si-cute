import { NextResponse } from "next/server";

import { client, isDatabaseConfigured } from "@/lib/db/client";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;

const dashboardCache = new Map<
  string,
  { expiresAt: number; payload: Record<string, unknown> }
>();
const dashboardCacheSeconds = 20;

function dashboardResponse(payload: Record<string, unknown>) {
  const response = NextResponse.json(payload);
  // Cache only in the current user's browser. It avoids repeat Turso reads
  // without exposing personnel data through a CDN.
  response.headers.set(
    "Cache-Control",
    `private, max-age=${dashboardCacheSeconds}, stale-while-revalidate=30`,
  );
  return response;
}

const roleLabels: Record<string, string> = {
  admin_hr: "Admin Pembuat Daftar Cuti",
  pegawai: "Pegawai",
  pppk: "PPPK",
  atasan_langsung: "Atasan Langsung",
  pejabat_berwenang: "Pejabat Berwenang",
};

const leaveTypeLabels: Record<string, string> = {
  tahunan: "Cuti Tahunan",
  besar: "Cuti Besar",
  sakit: "Cuti Sakit",
  melahirkan: "Cuti Melahirkan",
  alasan_penting: "Cuti Alasan Penting",
  di_luar_tanggungan_negara: "Cuti Di Luar Tanggungan Negara",
};

const statusLabels: Record<string, string> = {
  pending_admin: "Pending Admin",
  pending_atasan: "Pending Atasan",
  pending_pejabat: "Pending Pejabat",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  perbaikan: "Perbaikan",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") ?? "admin";
    const nip = searchParams.get("nip")?.trim() ?? "";
    const cacheKey = `${role}:${nip}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return dashboardResponse(cached.payload);
    }

    // The dashboard is read by several roles.  Sending every leave request to
    // every account was the biggest source of unnecessary Turso work.
    const employeeScope =
      role === "pegawai" || role === "pppk"
        ? { sql: "(u.nip = ? OR u.nip = (SELECT atasan_nip FROM users WHERE nip = ?) OR u.peran = 'pejabat_berwenang')", args: [nip, nip] }
        : role === "atasan"
          ? { sql: "(u.nip = ? OR u.atasan_nip = ? OR u.peran = 'pejabat_berwenang')", args: [nip, nip] }
          : { sql: "1 = 1", args: [] };
    const requestScope =
      role === "pegawai" || role === "pppk"
        ? { sql: "AND r.nip = ?", args: [nip] }
        : role === "atasan"
          ? { sql: "AND u.atasan_nip = ?", args: [nip] }
          : { sql: "", args: [] };

    const results = await client.batch([
      {
        sql: `
          SELECT u.nip, u.nama, u.peran, u.no_whatsapp, u.atasan_nip,
                 u.golongan_ruang, u.jabatan, u.masa_kerja_tahun,
                 u.masa_kerja_bulan, u.masa_kerja_per, u.pejabat_nip,
                 COALESCE(a.nama, '-') AS atasan_nama,
                 COALESCE(p.nama, 'Pejabat Berwenang') AS pejabat_nama
          FROM users u
          LEFT JOIN users a ON a.nip = u.atasan_nip
          LEFT JOIN users p ON p.nip = u.pejabat_nip
          WHERE u.aktif = 1 AND ${employeeScope.sql}
          ORDER BY u.nama
        `,
        args: employeeScope.args,
      },
      {
        sql: `
          SELECT ur.nip, ur.peran
          FROM user_roles ur
          JOIN users u ON u.nip = ur.nip
          WHERE u.aktif = 1 AND ${employeeScope.sql}
          ORDER BY ur.id
        `,
        args: employeeScope.args,
      },
      {
        sql: `
          SELECT lq.nip, lq.tahun, lq.kuota_total, lq.sisa_kuota, lq.sumber
          FROM leave_quotas lq
          JOIN users u ON u.nip = lq.nip
          WHERE u.aktif = 1 AND ${employeeScope.sql}
          ORDER BY lq.tahun DESC, lq.id
        `,
        args: employeeScope.args,
      },
      {
        sql: `
          SELECT r.id, r.nip, r.jenis_cuti, r.tgl_mulai, r.tgl_selesai,
                 r.jumlah_hari, r.alasan, r.alamat_cuti, r.no_surat, r.status,
                 r.created_at, u.nama,
                 COALESCE(a.nama, '-') AS atasan_nama,
                 ap.catatan
          FROM leave_requests r
          JOIN users u ON u.nip = r.nip
          LEFT JOIN users a ON a.nip = u.atasan_nip
          LEFT JOIN (
            SELECT request_id, catatan
            FROM (
              SELECT request_id, catatan,
                     ROW_NUMBER() OVER (
                       PARTITION BY request_id
                       ORDER BY timestamp DESC, id DESC
                     ) AS row_number
              FROM approvals
            ) latest_approvals
            WHERE row_number = 1
          ) ap ON ap.request_id = r.id
          WHERE 1 = 1 ${requestScope.sql}
          ORDER BY r.created_at DESC, r.id DESC
        `,
        args: requestScope.args,
      },
      {
        sql: `
          SELECT nip, nama FROM users
          WHERE aktif = 1 AND peran = 'pejabat_berwenang'
          ORDER BY nama LIMIT 1
        `,
      },
    ], "read");
    const [employeeRows, roleRows, quotaRows, requestRows, pybRows] = results.map(
      (result) => result.rows as unknown as Row[],
    );

    const rolesByNip = new Map<string, string[]>();
    for (const row of roleRows) {
      const nip = String(row.nip);
      const role = roleLabels[String(row.peran)] ?? String(row.peran);
      rolesByNip.set(nip, [...(rolesByNip.get(nip) ?? []), role]);
    }

    const quotasByNip = new Map<
      string,
      { year: number; remaining: number; used: number }[]
    >();
    for (const row of quotaRows) {
      const nip = String(row.nip);
      const total = Number(row.kuota_total ?? 0);
      const remaining = Number(row.sisa_kuota ?? 0);
      const existing = quotasByNip.get(nip) ?? [];
      const sameYear = existing.find((quota) => quota.year === Number(row.tahun));
      if (sameYear) {
        sameYear.remaining += remaining;
        sameYear.used += Math.max(0, total - remaining);
      } else {
        existing.push({
          year: Number(row.tahun),
          remaining,
          used: Math.max(0, total - remaining),
        });
      }
      quotasByNip.set(nip, existing);
    }

    const employees = employeeRows.map((row) => {
      const nip = String(row.nip);
      const primaryRole = roleLabels[String(row.peran)] ?? String(row.peran);
      const roles = Array.from(
        new Set([primaryRole, ...(rolesByNip.get(nip) ?? [])]),
      );
      return {
        name: String(row.nama),
        nip,
        role: primaryRole,
        roles,
        position: String(row.jabatan ?? "-"),
        grade: String(row.golongan_ruang ?? "-"),
        serviceYears: Number(row.masa_kerja_tahun ?? 0),
        serviceMonths: Number(row.masa_kerja_bulan ?? 0),
        serviceAsOf: String(
          row.masa_kerja_per ?? new Date().toISOString().slice(0, 7),
        ).slice(0, 7),
        supervisor: String(row.atasan_nama ?? "-"),
        approver: String(row.pejabat_nama ?? "Pejabat Berwenang"),
        quotas: quotasByNip.get(nip) ?? [],
        bknMode: primaryRole === "PPPK" ? "Batas sesuai ketentuan" : "Normal",
        whatsapp: row.no_whatsapp ? "Aktif" : "Perlu cek",
        whatsappNumber: String(row.no_whatsapp ?? ""),
      };
    });

    const pybName = String(pybRows[0]?.nama ?? "Pejabat Berwenang");
    const requests = requestRows.map((row) => {
      const createdAt = String(row.created_at ?? "");
      const year = new Date(createdAt).getFullYear() || new Date().getFullYear();
      return {
        id: `CUTI-${year}-${String(row.id).padStart(3, "0")}`,
        databaseId: Number(row.id),
        employee: String(row.nama),
        nip: String(row.nip),
        type: leaveTypeLabels[String(row.jenis_cuti)] ?? String(row.jenis_cuti),
        start: formatDate(String(row.tgl_mulai)),
        end: formatDate(String(row.tgl_selesai)),
        submittedAt: formatDate(createdAt),
        serviceYearsAtSubmission: 0,
        serviceMonthsAtSubmission: 0,
        days: Number(row.jumlah_hari),
        reason: String(row.alasan),
        address: String(row.alamat_cuti),
        status: statusLabels[String(row.status)] ?? String(row.status),
        reviewer: String(row.atasan_nama ?? "-"),
        approver: pybName,
        note: String(row.catatan ?? "Data langsung dari Turso"),
        noSurat: row.no_surat ? String(row.no_surat) : null,
      };
    });

    const payload = {
      source: process.env.TURSO_DATABASE_URL?.startsWith("libsql:")
        ? "turso-live"
        : isDatabaseConfigured
          ? "sqlite-local-replica"
          : "fallback",
      employees,
      requests,
    };
    dashboardCache.set(cacheKey, {
      expiresAt: Date.now() + dashboardCacheSeconds * 1000,
      payload,
    });
    return dashboardResponse(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Database gagal dibaca",
      },
      { status: 500 },
    );
  }
}




