import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { GET as getDashboard } from "@/app/api/dashboard/route";
import { db } from "@/lib/db/client";
import { ensureAnnualQuotaRollover } from "@/lib/annual-rollover";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import {
  ensureEmployeeNonAnnualLeaves,
  nonAnnualLeaveTypes,
  type NonAnnualLeaveType,
} from "@/lib/employee-nonannual-leaves";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await getDashboard(
    new Request("http://localhost/api/dashboard?role=admin"),
  );
  const data = (await response.json()) as {
    employees?: Array<Record<string, unknown>>;
    error?: string;
  };

  if (!response.ok || !data.employees) {
    return NextResponse.json(
      { error: data.error ?? "Data pegawai belum bisa dimuat." },
      { status: response.status || 500 },
    );
  }

  const employees = data.employees.map((employee) => ({
    ...employee,
    position: String(employee.position ?? "-"),
    approver: String(employee.approver ?? "Pejabat Berwenang"),
  }));

  return NextResponse.json({ employees, source: "turso-live" });
}

const roleCodes: Record<string, string> = {
  Pegawai: "pegawai",
  PPPK: "pppk",
  "Atasan Langsung": "atasan_langsung",
  "Pejabat Berwenang": "pejabat_berwenang",
  "Admin Pembuat Daftar Cuti": "admin_hr",
};

type EmployeePayload = {
  nip?: string; name?: string; role?: string; roles?: string[];
  position?: string; grade?: string; serviceYears?: number; serviceMonths?: number;
  serviceAsOf?: string; supervisor?: string; approver?: string;
  whatsappNumber?: string; accountPassword?: string;
  quotas?: Array<{ year: number; remaining: number }>;
  nonAnnualLeaves?: Array<{ type: NonAnnualLeaveType; days: number }>;
};

async function saveNonAnnualLeaves(nip: string, leaves: EmployeePayload["nonAnnualLeaves"]) {
  await ensureEmployeeNonAnnualLeaves();
  for (const leave of leaves ?? []) {
    if (!nonAnnualLeaveTypes.includes(leave.type)) continue;
    await db.run(sql`
      INSERT INTO employee_nonannual_leaves (nip, jenis_cuti, jumlah_hari, updated_at)
      VALUES (${nip}, ${leave.type}, ${Math.max(0, Number(leave.days) || 0)}, CURRENT_TIMESTAMP)
      ON CONFLICT(nip, jenis_cuti) DO UPDATE SET
        jumlah_hari = excluded.jumlah_hari,
        updated_at = CURRENT_TIMESTAMP
    `);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EmployeePayload;
    const nip = body.nip?.trim();
    const name = body.name?.trim();
    if (!nip || !name || !body.accountPassword || body.accountPassword.length < 6) {
      return NextResponse.json({ error: "Nama, NIP, dan kata sandi minimal 6 karakter wajib diisi." }, { status: 400 });
    }
    const roles = Array.from(new Set((body.roles?.length ? body.roles : [body.role ?? "Pegawai"])
      .map((role) => roleCodes[role]).filter(Boolean)));
    const primaryRole = roles[0] ?? "pegawai";
    const supervisor = body.supervisor && body.supervisor !== "-" ? body.supervisor : null;
    const approver = body.approver && body.approver !== "-" ? body.approver : null;
    const passwordHash = await bcrypt.hash(body.accountPassword, 10);

    await db.run(sql`
      INSERT INTO users (
        nip, password_hash, nama, peran, no_whatsapp, atasan_nip, pejabat_nip,
        jabatan, golongan_ruang, masa_kerja_tahun, masa_kerja_bulan, masa_kerja_per, aktif
      ) VALUES (
        ${nip}, ${passwordHash}, ${name}, ${primaryRole}, ${body.whatsappNumber?.trim() ?? ""},
        (SELECT nip FROM users WHERE nama = ${supervisor} LIMIT 1),
        (SELECT nip FROM users WHERE nama = ${approver} LIMIT 1),
        ${body.position?.trim() ?? "Pelaksana"}, ${body.grade?.trim() ?? ""},
        ${Number(body.serviceYears ?? 0)}, ${Number(body.serviceMonths ?? 0)},
        ${body.serviceAsOf ?? new Date().toISOString().slice(0, 7)}, 1
      )
    `);
    for (const role of roles) {
      await db.run(sql`INSERT INTO user_roles (nip, peran) VALUES (${nip}, ${role})`);
    }
    for (const quota of body.quotas ?? []) {
      const source = quota.year === new Date().getFullYear() ? "tahun_berjalan" : "sisa_tahun_lalu";
      await db.run(sql`
        INSERT INTO leave_quotas (nip, tahun, kuota_total, sisa_kuota, sumber, updated_at)
        VALUES (${nip}, ${quota.year}, 12, ${Number(quota.remaining)}, ${source}, CURRENT_TIMESTAMP)
      `);
    }
    await saveNonAnnualLeaves(nip, body.nonAnnualLeaves);
    invalidateDashboardCache();
    return refreshedEmployees();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pegawai baru belum bisa disimpan." }, { status: 500 });
  }
}

async function refreshedEmployees() {
  return GET();
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as EmployeePayload;
    if (!body.nip?.trim() || !body.name?.trim()) {
      return NextResponse.json({ error: "Nama dan NIP wajib diisi." }, { status: 400 });
    }
    const roles = Array.from(new Set((body.roles?.length ? body.roles : [body.role ?? "Pegawai"])
      .map((role) => roleCodes[role]).filter(Boolean)));
    const primaryRole = roles[0] ?? "pegawai";
    const supervisor = body.supervisor && body.supervisor !== "-" ? body.supervisor : null;
    const approver = body.approver && body.approver !== "-" ? body.approver : null;

    await db.run(sql`
      UPDATE users SET
        nama = ${body.name.trim()}, peran = ${primaryRole},
        no_whatsapp = ${body.whatsappNumber?.trim() ?? ""},
        atasan_nip = (SELECT nip FROM users WHERE nama = ${supervisor} LIMIT 1),
        pejabat_nip = (SELECT nip FROM users WHERE nama = ${approver} LIMIT 1),
        jabatan = ${body.position?.trim() ?? "Pelaksana"},
        golongan_ruang = ${body.grade?.trim() ?? ""},
        masa_kerja_tahun = ${Number(body.serviceYears ?? 0)},
        masa_kerja_bulan = ${Number(body.serviceMonths ?? 0)},
        masa_kerja_per = ${body.serviceAsOf ?? new Date().toISOString().slice(0, 7)}
      WHERE nip = ${body.nip.trim()}
    `);
    await db.run(sql`DELETE FROM user_roles WHERE nip = ${body.nip.trim()}`);
    for (const role of roles) {
      await db.run(sql`INSERT INTO user_roles (nip, peran) VALUES (${body.nip.trim()}, ${role})`);
    }
    for (const quota of body.quotas ?? []) {
      const source = quota.year === new Date().getFullYear() ? "tahun_berjalan" : "sisa_tahun_lalu";
      await db.run(sql`
        INSERT INTO leave_quotas (nip, tahun, kuota_total, sisa_kuota, sumber, updated_at)
        VALUES (${body.nip.trim()}, ${quota.year}, 12, ${Number(quota.remaining)}, ${source}, CURRENT_TIMESTAMP)
        ON CONFLICT(nip, tahun, sumber) DO UPDATE SET sisa_kuota = excluded.sisa_kuota, updated_at = CURRENT_TIMESTAMP
      `);
    }
    await saveNonAnnualLeaves(body.nip.trim(), body.nonAnnualLeaves);
    invalidateDashboardCache();
    return refreshedEmployees();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Data pegawai belum bisa disimpan." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action !== "reset-current-year-quota") {
      return NextResponse.json({ error: "Aksi kuota tidak dikenali." }, { status: 400 });
    }
    await ensureAnnualQuotaRollover();
    invalidateDashboardCache();
    return refreshedEmployees();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rollover kuota belum bisa dijalankan." },
      { status: 500 },
    );
  }
}
