import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { GET as getDashboard } from "@/app/api/dashboard/route";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { db } from "@/lib/db/client";
import { sendWhatsApp } from "@/lib/whatsapp";
import { ensureRequestSignatures, saveRequestSignature } from "@/lib/request-signatures";
import { getWorkingDays } from "@/lib/holidays";
import { ensureEmployeeNonAnnualLeaves } from "@/lib/employee-nonannual-leaves";

export const dynamic = "force-dynamic";

const leaveTypeValues: Record<string, string> = {
  "Cuti Tahunan": "tahunan",
  "Cuti Besar": "besar",
  "Cuti Sakit": "sakit",
  "Cuti Melahirkan": "melahirkan",
  "Cuti Alasan Penting": "alasan_penting",
  "Cuti Di Luar Tanggungan Negara": "di_luar_tanggungan_negara",
};

const leaveTypeLabels: Record<string, string> = {
  tahunan: "Cuti Tahunan",
  besar: "Cuti Besar",
  sakit: "Cuti Sakit",
  melahirkan: "Cuti Melahirkan",
  alasan_penting: "Cuti Alasan Penting",
  di_luar_tanggungan_negara: "Cuti Di Luar Tanggungan Negara",
};

const statusValues: Record<string, string> = {
  "Pending Admin": "pending_admin",
  "Pending Atasan": "pending_atasan",
  "Pending Pejabat": "pending_pejabat",
  Disetujui: "disetujui",
  Ditolak: "ditolak",
  Perbaikan: "perbaikan",
};

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://sicute.pa-sampang.go.id").replace(/\/$/, "");

function currentJakartaYearStart() {
  const year = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  return `${year}-01-01`;
}

function approvalLink(role: "atasan" | "pyb", nip: string) {
  return `${appUrl}/?role=${role}&nip=${encodeURIComponent(nip)}`;
}

export async function GET() {
  const response = await getDashboard(
    new Request("http://localhost/api/dashboard?role=admin"),
  );
  const data = (await response.json()) as {
    requests?: Array<Record<string, unknown>>;
    error?: string;
  };

  if (!response.ok || !data.requests) {
    return NextResponse.json(
      { error: data.error ?? "Data pengajuan belum bisa dimuat." },
      { status: response.status || 500 },
    );
  }

  const requests = data.requests.map((request) => ({
    ...request,
    dbId: request.databaseId,
  }));

  return NextResponse.json({ requests, source: "turso-live" });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nip?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      days?: number;
      reason?: string;
      address?: string;
      attachment?: { dataUrl?: string } | null;
      signature?: string;
    };
    const type = leaveTypeValues[body.type ?? ""];
    if (
      !body.nip ||
      !type ||
      !body.startDate ||
      !body.endDate ||
      !body.reason ||
      !body.address
    ) {
      return NextResponse.json(
        { error: "Data pengajuan belum lengkap." },
        { status: 400 },
      );
    }

    const workingDays = await getWorkingDays(body.startDate, body.endDate);
    if (workingDays <= 0) {
      return NextResponse.json(
        { error: "Rentang tanggal tidak memiliki hari kerja setelah libur dan akhir pekan dikecualikan." },
        { status: 400 },
      );
    }

    if (type === "tahunan") {
      const quotaRows = await db.all<{ remaining: number }>(sql`
        SELECT COALESCE(SUM(sisa_kuota), 0) AS remaining
        FROM leave_quotas
        WHERE nip = ${body.nip} AND sisa_kuota > 0
      `);
      const pendingRows = await db.all<{ reserved: number }>(sql`
        SELECT COALESCE(SUM(jumlah_hari), 0) AS reserved
        FROM leave_requests
        WHERE nip = ${body.nip}
          AND jenis_cuti = 'tahunan'
          AND status IN ('pending_admin', 'pending_atasan', 'pending_pejabat')
      `);
      const availableDays =
        Number(quotaRows[0]?.remaining ?? 0) -
        Number(pendingRows[0]?.reserved ?? 0);

      if (availableDays <= 0) {
        return NextResponse.json(
          { error: "Sisa cuti tahunan sudah habis. Pengajuan tidak dapat dikirim." },
          { status: 400 },
        );
      }
      if (workingDays > availableDays) {
        return NextResponse.json(
          { error: `Sisa cuti tahunan hanya ${availableDays} hari.` },
          { status: 400 },
        );
      }
    }

    await ensureRequestSignatures();
    await ensureEmployeeNonAnnualLeaves();
    const createdRequest = await db.run(sql`
      INSERT INTO leave_requests
        (nip, jenis_cuti, tgl_mulai, tgl_selesai, jumlah_hari, alasan, alamat_cuti, lampiran_url, status, created_at, updated_at)
      VALUES
        (${body.nip}, ${type}, ${body.startDate}, ${body.endDate},
         ${workingDays}, ${body.reason}, ${body.address},
         ${body.attachment?.dataUrl ?? null}, 'pending_admin',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const requestId = Number(createdRequest.lastInsertRowid);
    if (body.signature) await saveRequestSignature(requestId, "pemohon", body.nip, body.signature);
    const applicant = await db.all<{ nama: string }>(sql`
      SELECT nama FROM users WHERE nip = ${body.nip} LIMIT 1
    `);
    const admins = await db.all<{
      nip: string;
      nama: string;
      noWhatsapp: string;
    }>(sql`
      SELECT DISTINCT u.nip, u.nama, u.no_whatsapp AS noWhatsapp
      FROM users u
      LEFT JOIN user_roles ur ON ur.nip = u.nip
      WHERE u.aktif = 1
        AND u.no_whatsapp <> ''
        AND (u.peran = 'admin_hr' OR ur.peran = 'admin_hr')
    `);
    const totalRows = type === "tahunan"
      ? []
      : await db.all<{ total: number }>(sql`
          SELECT
            COALESCE((SELECT jumlah_hari FROM employee_nonannual_leaves WHERE nip = ${body.nip} AND jenis_cuti = ${type}), 0) +
            COALESCE((SELECT SUM(jumlah_hari) FROM leave_requests WHERE nip = ${body.nip} AND jenis_cuti = ${type} AND status <> 'ditolak' AND created_at >= ${currentJakartaYearStart()}), 0)
            AS total
        `);
    const totalLine = type === "tahunan"
      ? ""
      : `\nTotal ${leaveTypeLabels[type]}: ${Number(totalRows[0]?.total ?? 0)} hari`;
    const message = `📋 *Pengajuan Cuti Baru Menunggu Verifikasi Admin*\n\nPegawai: ${applicant[0]?.nama ?? body.nip}\nNIP: ${body.nip}\nJenis cuti: ${body.type}\nTanggal: ${body.startDate} s/d ${body.endDate}\nDurasi: ${workingDays} hari kerja${totalLine}\n\nSilakan buka SI CUTE untuk memeriksa dokumen dan mengisi nomor surat.`;

    await Promise.all(
      admins.map(async (admin) => {
        try {
          const result = await sendWhatsApp({
            to: admin.noWhatsapp,
            message,
          });
          await db.run(sql`
            INSERT INTO whatsapp_logs
              (request_id, target_nip, no_whatsapp, provider, message, status, provider_message_id, created_at)
            VALUES
              (${requestId}, ${admin.nip}, ${admin.noWhatsapp},
               ${result.provider}, ${message}, ${result.ok ? "sent" : "failed"},
               ${result.providerMessageId ?? null}, CURRENT_TIMESTAMP)
          `);
        } catch (whatsappError) {
          await db.run(sql`
            INSERT INTO whatsapp_logs
              (request_id, target_nip, no_whatsapp, provider, message, status, error, created_at)
            VALUES
              (${requestId}, ${admin.nip}, ${admin.noWhatsapp},
               'fonnte', ${message}, 'failed',
               ${whatsappError instanceof Error ? whatsappError.message : "WhatsApp gagal dikirim"}, CURRENT_TIMESTAMP)
          `);
        }
      }),
    );
    invalidateDashboardCache();
    return GET();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pengajuan gagal disimpan." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      dbId?: number;
      status?: string;
      note?: string;
      approverNip?: string;
      noSurat?: string;
      signature?: string;
    };
    const numericId = Number(body.dbId ?? String(body.id ?? "").split("-").pop());
    const status = statusValues[body.status ?? ""];
    if (!numericId || !status || !body.approverNip) {
      return NextResponse.json(
        { error: "Data keputusan belum lengkap." },
        { status: 400 },
      );
    }

    const currentRows = await db.all<{
      status: string;
      noSurat: string | null;
      nip: string;
      jenisCuti: string;
      jumlahHari: number;
    }>(sql`
      SELECT status, no_surat AS noSurat, nip, jenis_cuti AS jenisCuti, jumlah_hari AS jumlahHari
      FROM leave_requests WHERE id = ${numericId}
    `);
    const currentStatus = currentRows[0]?.status;
    await ensureRequestSignatures();
    await ensureEmployeeNonAnnualLeaves();
    const currentNoSurat = currentRows[0]?.noSurat;
    const nextApprovalStatus: Record<string, string> = {
      pending_admin: "pending_atasan",
      pending_atasan: "pending_pejabat",
      pending_pejabat: "disetujui",
    };
    if (
      ["pending_atasan", "pending_pejabat", "disetujui"].includes(status) &&
      nextApprovalStatus[currentStatus ?? ""] !== status
    ) {
      return NextResponse.json(
        { error: "Tahapan persetujuan tidak sesuai urutan." },
        { status: 400 },
      );
    }

    const adminApproval = currentStatus === "pending_admin" && status === "pending_atasan";
    const continuedApproval =
      (currentStatus === "pending_atasan" && status === "pending_pejabat") ||
      (currentStatus === "pending_pejabat" && status === "disetujui");
    if (adminApproval && !body.noSurat?.trim()) {
      return NextResponse.json(
        { error: "Nomor surat wajib diisi oleh Admin sebelum diteruskan." },
        { status: 400 },
      );
    }
    if (adminApproval && !body.signature?.trim()) {
      return NextResponse.json(
        { error: "Paraf Admin wajib diisi sebelum pengajuan diteruskan." },
        { status: 400 },
      );
    }
    if (continuedApproval && !currentNoSurat) {
      return NextResponse.json(
        { error: "Nomor surat belum diisi Admin. Pengajuan belum dapat diteruskan." },
        { status: 400 },
      );
    }

    // Kuota hanya dipotong sekali: saat PyB menyetujui cuti tahunan.
    // Baris kuota diurutkan dari tahun terlama supaya saldo carry-over habis lebih dahulu.
    if (
      currentStatus === "pending_pejabat" &&
      status === "disetujui" &&
      currentRows[0]?.jenisCuti === "tahunan"
    ) {
      let remainingDays = Number(currentRows[0].jumlahHari);
      const quotas = await db.all<{ id: number; sisaKuota: number }>(sql`
        SELECT id, sisa_kuota AS sisaKuota
        FROM leave_quotas
        WHERE nip = ${currentRows[0].nip} AND sisa_kuota > 0
        ORDER BY tahun ASC, id ASC
      `);
      const deductions = quotas.map((quota) => {
        const days = Math.min(Number(quota.sisaKuota), remainingDays);
        remainingDays -= days;
        return { id: Number(quota.id), days };
      }).filter((deduction) => deduction.days > 0);

      if (remainingDays > 0) {
        return NextResponse.json(
          { error: "Sisa cuti tahunan pegawai tidak cukup untuk disetujui." },
          { status: 400 },
        );
      }

      for (const deduction of deductions) {
        await db.run(sql`
          UPDATE leave_quotas
          SET sisa_kuota = sisa_kuota - ${deduction.days}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${deduction.id} AND sisa_kuota >= ${deduction.days}
        `);
      }
    }

    if (adminApproval && body.noSurat?.trim()) {
      await db.run(sql`
        UPDATE leave_requests
        SET status = ${status}, no_surat = ${body.noSurat.trim()}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${numericId}
      `);
    } else {
      await db.run(sql`
        UPDATE leave_requests
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${numericId}
      `);
    }

    if (status === "pending_atasan" || status === "pending_pejabat" || status === "disetujui" || status === "ditolak" || status === "perbaikan") {
      const stage = currentStatus === "pending_admin"
        ? "tingkat_0_admin"
        : currentStatus === "pending_atasan"
          ? "tingkat_1_atasan"
          : "tingkat_2_pejabat";
      const decision = status === "perbaikan"
        ? "perbaikan"
        : status === "ditolak"
          ? "ditolak"
          : "disetujui";
      await db.run(sql`
        INSERT INTO approvals
          (request_id, approver_nip, tahapan, keputusan, catatan, timestamp)
        VALUES
          (${numericId}, ${body.approverNip}, ${stage}, ${decision},
           ${body.note ?? ""}, CURRENT_TIMESTAMP)
      `);
    }
    if (currentStatus === "pending_admin" && status === "pending_atasan" && body.signature) await saveRequestSignature(numericId, "admin", body.approverNip, body.signature);
    if (currentStatus === "pending_atasan" && status === "pending_pejabat" && body.signature) await saveRequestSignature(numericId, "atasan", body.approverNip, body.signature);
    if (currentStatus === "pending_pejabat" && status === "disetujui" && body.signature) await saveRequestSignature(numericId, "pyb", body.approverNip, body.signature);

    if (currentStatus === "pending_admin" && status === "pending_atasan") {
      const recipients = await db.all<{
        namaPegawai: string;
        jenisCuti: string;
        tglMulai: string;
        tglSelesai: string;
        jumlahHari: number;
        nipPegawai: string;
        atasanNip: string | null;
        noWhatsappAtasan: string | null;
      }>(sql`
        SELECT u.nama AS namaPegawai, r.jenis_cuti AS jenisCuti,
               r.tgl_mulai AS tglMulai, r.tgl_selesai AS tglSelesai,
               r.jumlah_hari AS jumlahHari, r.nip AS nipPegawai, a.nip AS atasanNip,
               a.no_whatsapp AS noWhatsappAtasan
        FROM leave_requests r
        JOIN users u ON u.nip = r.nip
        LEFT JOIN users a ON a.nip = u.atasan_nip
        WHERE r.id = ${numericId}
      `);
      const recipient = recipients[0];
      if (recipient?.noWhatsappAtasan && recipient.atasanNip) {
        const totalRows = recipient.jenisCuti === "tahunan"
          ? []
          : await db.all<{ total: number }>(sql`
              SELECT
                COALESCE((
                  SELECT jumlah_hari
                  FROM employee_nonannual_leaves
                  WHERE nip = ${recipient.nipPegawai}
                    AND jenis_cuti = ${recipient.jenisCuti}
                ), 0) +
                COALESCE((
                  SELECT SUM(jumlah_hari)
                  FROM leave_requests
                  WHERE nip = ${recipient.nipPegawai}
                    AND jenis_cuti = ${recipient.jenisCuti}
                    AND status <> 'ditolak'
                    AND created_at >= ${currentJakartaYearStart()}
                ), 0) AS total
            `);
        const totalLine = recipient.jenisCuti === "tahunan"
          ? ""
          : `\nTotal ${leaveTypeLabels[recipient.jenisCuti] ?? recipient.jenisCuti}: ${Number(totalRows[0]?.total ?? 0)} hari`;
        const message = `📋 *Pengajuan Cuti Menunggu Persetujuan Atasan*\n\nPegawai: ${recipient.namaPegawai}\nJenis cuti: ${leaveTypeLabels[recipient.jenisCuti] ?? recipient.jenisCuti}\nTanggal: ${recipient.tglMulai} s/d ${recipient.tglSelesai}\nDurasi: ${recipient.jumlahHari} hari${totalLine}\nNo. Surat: ${body.noSurat}\n\nPengajuan telah diverifikasi Admin. Silakan buka SI CUTE untuk memberikan keputusan: *Setujui, Tunda, atau Tolak*.\n${approvalLink("atasan", recipient.atasanNip)}`;
        try {
          const result = await sendWhatsApp({
            to: recipient.noWhatsappAtasan,
            message,
          });
          await db.run(sql`
            INSERT INTO whatsapp_logs
              (request_id, target_nip, no_whatsapp, provider, message, status, provider_message_id, created_at)
            VALUES
              (${numericId}, ${recipient.atasanNip}, ${recipient.noWhatsappAtasan},
               ${result.provider}, ${message}, ${result.ok ? "sent" : "failed"},
               ${result.providerMessageId ?? null}, CURRENT_TIMESTAMP)
          `);
        } catch (whatsappError) {
          await db.run(sql`
            INSERT INTO whatsapp_logs
              (request_id, target_nip, no_whatsapp, provider, message, status, error, created_at)
            VALUES
              (${numericId}, ${recipient.atasanNip}, ${recipient.noWhatsappAtasan},
               'fonnte', ${message}, 'failed',
               ${whatsappError instanceof Error ? whatsappError.message : "WhatsApp gagal dikirim"},
               CURRENT_TIMESTAMP)
          `);
        }
      }
    }

    if (currentStatus === "pending_atasan" && status === "pending_pejabat") {
      const recipients = await db.all<{
        namaPegawai: string;
        nipPegawai: string;
        jenisCuti: string;
        tglMulai: string;
        tglSelesai: string;
        jumlahHari: number;
        pybNip: string | null;
        noWhatsappPyb: string | null;
      }>(sql`
        SELECT u.nama AS namaPegawai, r.nip AS nipPegawai,
               r.jenis_cuti AS jenisCuti, r.tgl_mulai AS tglMulai,
               r.tgl_selesai AS tglSelesai, r.jumlah_hari AS jumlahHari,
               p.nip AS pybNip, p.no_whatsapp AS noWhatsappPyb
        FROM leave_requests r
        JOIN users u ON u.nip = r.nip
        LEFT JOIN users p ON p.nip = u.pejabat_nip
        WHERE r.id = ${numericId}
      `);
      const recipient = recipients[0];
      if (recipient?.noWhatsappPyb && recipient.pybNip) {
        const totalRows = recipient.jenisCuti === "tahunan"
          ? []
          : await db.all<{ total: number }>(sql`
              SELECT
                COALESCE((SELECT jumlah_hari FROM employee_nonannual_leaves WHERE nip = ${recipient.nipPegawai} AND jenis_cuti = ${recipient.jenisCuti}), 0) +
                COALESCE((SELECT SUM(jumlah_hari) FROM leave_requests WHERE nip = ${recipient.nipPegawai} AND jenis_cuti = ${recipient.jenisCuti} AND status <> 'ditolak' AND created_at >= ${currentJakartaYearStart()}), 0)
                AS total
            `);
        const totalLine = recipient.jenisCuti === "tahunan"
          ? ""
          : `\nTotal ${leaveTypeLabels[recipient.jenisCuti] ?? recipient.jenisCuti}: ${Number(totalRows[0]?.total ?? 0)} hari`;
        const message = `📋 *Pengajuan Cuti Menunggu Keputusan PYB*\n\nPegawai: ${recipient.namaPegawai}\nNIP: ${recipient.nipPegawai}\nJenis cuti: ${leaveTypeLabels[recipient.jenisCuti] ?? recipient.jenisCuti}\nTanggal: ${recipient.tglMulai} s/d ${recipient.tglSelesai}\nDurasi: ${recipient.jumlahHari} hari${totalLine}\nNo. Surat: ${currentNoSurat ?? "-"}\n\nAtasan langsung telah menyetujui pengajuan. Silakan buka SI CUTE untuk memberikan keputusan: *Setujui, Tunda, atau Tolak*.\n${approvalLink("pyb", recipient.pybNip)}`;
        try {
          const result = await sendWhatsApp({
            to: recipient.noWhatsappPyb,
            message,
          });
          await db.run(sql`
            INSERT INTO whatsapp_logs
              (request_id, target_nip, no_whatsapp, provider, message, status, provider_message_id, created_at)
            VALUES
              (${numericId}, ${recipient.pybNip}, ${recipient.noWhatsappPyb},
               ${result.provider}, ${message}, ${result.ok ? "sent" : "failed"},
               ${result.providerMessageId ?? null}, CURRENT_TIMESTAMP)
          `);
        } catch (whatsappError) {
          await db.run(sql`
            INSERT INTO whatsapp_logs
              (request_id, target_nip, no_whatsapp, provider, message, status, error, created_at)
            VALUES
              (${numericId}, ${recipient.pybNip}, ${recipient.noWhatsappPyb},
               'fonnte', ${message}, 'failed',
               ${whatsappError instanceof Error ? whatsappError.message : "WhatsApp gagal dikirim"}, CURRENT_TIMESTAMP)
          `);
        }
      }
    }

    if (
      currentStatus === "pending_pejabat" &&
      ["disetujui", "ditolak", "perbaikan"].includes(status)
    ) {
      const notificationRows = await db.all<{
        namaPegawai: string;
        nipPegawai: string;
        jenisCuti: string;
        tglMulai: string;
        tglSelesai: string;
        jumlahHari: number;
        noSurat: string | null;
        noWhatsappPemohon: string;
      }>(sql`
        SELECT u.nama AS namaPegawai, r.nip AS nipPegawai,
               r.jenis_cuti AS jenisCuti, r.tgl_mulai AS tglMulai,
               r.tgl_selesai AS tglSelesai, r.jumlah_hari AS jumlahHari,
               r.no_surat AS noSurat, u.no_whatsapp AS noWhatsappPemohon
        FROM leave_requests r
        JOIN users u ON u.nip = r.nip
        WHERE r.id = ${numericId}
      `);
      const requestInfo = notificationRows[0];
      const admins = await db.all<{ nip: string; noWhatsapp: string }>(sql`
        SELECT DISTINCT u.nip, u.no_whatsapp AS noWhatsapp
        FROM users u
        LEFT JOIN user_roles ur ON ur.nip = u.nip
        WHERE u.aktif = 1
          AND u.no_whatsapp <> ''
          AND (u.peran = 'admin_hr' OR ur.peran = 'admin_hr')
      `);

      if (requestInfo) {
        const resultLabel =
          status === "disetujui"
            ? "DISETUJUI"
            : status === "ditolak"
              ? "DITOLAK"
              : "DITUNDA / DIKEMBALIKAN UNTUK PERBAIKAN";
        const message = `📋 *Keputusan Cuti oleh PYB*\n\nPengajuan: ${resultLabel}\nPegawai: ${requestInfo.namaPegawai}\nJenis cuti: ${requestInfo.jenisCuti}\nTanggal: ${requestInfo.tglMulai} s/d ${requestInfo.tglSelesai}\nDurasi: ${requestInfo.jumlahHari} hari\nNo. Surat: ${requestInfo.noSurat ?? "-"}\n\nSilakan buka SI CUTE untuk melihat rincian keputusan.`;
        const recipients = [
          ...(requestInfo.noWhatsappPemohon
            ? [{ nip: requestInfo.nipPegawai, noWhatsapp: requestInfo.noWhatsappPemohon }]
            : []),
          ...admins,
        ].filter(
          (recipient, index, all) =>
            all.findIndex((candidate) => candidate.nip === recipient.nip) === index,
        );

        await Promise.all(
          recipients.map(async (recipient) => {
            try {
              const result = await sendWhatsApp({
                to: recipient.noWhatsapp,
                message,
              });
              await db.run(sql`
                INSERT INTO whatsapp_logs
                  (request_id, target_nip, no_whatsapp, provider, message, status, provider_message_id, created_at)
                VALUES
                  (${numericId}, ${recipient.nip}, ${recipient.noWhatsapp},
                   ${result.provider}, ${message}, ${result.ok ? "sent" : "failed"},
                   ${result.providerMessageId ?? null}, CURRENT_TIMESTAMP)
              `);
            } catch (whatsappError) {
              await db.run(sql`
                INSERT INTO whatsapp_logs
                  (request_id, target_nip, no_whatsapp, provider, message, status, error, created_at)
                VALUES
                  (${numericId}, ${recipient.nip}, ${recipient.noWhatsapp},
                   'fonnte', ${message}, 'failed',
                   ${whatsappError instanceof Error ? whatsappError.message : "WhatsApp gagal dikirim"}, CURRENT_TIMESTAMP)
              `);
            }
          }),
        );
      }
    }
    invalidateDashboardCache();
    return GET();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Keputusan gagal disimpan." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    }
    await db.run(sql`DELETE FROM leave_requests WHERE id = ${id}`);
    invalidateDashboardCache();
    return GET();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pengajuan gagal dihapus." },
      { status: 500 },
    );
  }
}





