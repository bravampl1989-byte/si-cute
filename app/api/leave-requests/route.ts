import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { GET as getDashboard } from "@/app/api/dashboard/route";
import { db } from "@/lib/db/client";
import { sendWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const leaveTypeValues: Record<string, string> = {
  "Cuti Tahunan": "tahunan",
  "Cuti Besar": "besar",
  "Cuti Sakit": "sakit",
  "Cuti Melahirkan": "melahirkan",
  "Cuti Alasan Penting": "alasan_penting",
  "Cuti Di Luar Tanggungan Negara": "di_luar_tanggungan_negara",
};

const statusValues: Record<string, string> = {
  "Pending Admin": "pending_admin",
  "Pending Atasan": "pending_atasan",
  "Pending Pejabat": "pending_pejabat",
  Disetujui: "disetujui",
  Ditolak: "ditolak",
  Perbaikan: "perbaikan",
};

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
    };
    const type = leaveTypeValues[body.type ?? ""];
    if (
      !body.nip ||
      !type ||
      !body.startDate ||
      !body.endDate ||
      !body.days ||
      !body.reason ||
      !body.address
    ) {
      return NextResponse.json(
        { error: "Data pengajuan belum lengkap." },
        { status: 400 },
      );
    }

    await db.run(sql`
      INSERT INTO leave_requests
        (nip, jenis_cuti, tgl_mulai, tgl_selesai, jumlah_hari, alasan, alamat_cuti, lampiran_url, status, created_at, updated_at)
      VALUES
        (${body.nip}, ${type}, ${body.startDate}, ${body.endDate},
         ${body.days}, ${body.reason}, ${body.address},
         ${body.attachment?.dataUrl ?? null}, 'pending_admin',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
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
    };
    const numericId = Number(body.dbId ?? String(body.id ?? "").split("-").pop());
    const status = statusValues[body.status ?? ""];
    if (!numericId || !status || !body.approverNip) {
      return NextResponse.json(
        { error: "Data keputusan belum lengkap." },
        { status: 400 },
      );
    }

    const currentRows = await db.all<{ status: string }>(sql`
      SELECT status FROM leave_requests WHERE id = ${numericId}
    `);
    const currentStatus = currentRows[0]?.status;
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

    const approvalStatus = ["pending_atasan", "pending_pejabat", "disetujui"];
    if (approvalStatus.includes(status) && !body.noSurat?.trim()) {
      return NextResponse.json(
        { error: "Nomor surat wajib diisi untuk keputusan setuju." },
        { status: 400 },
      );
    }

    if (body.noSurat?.trim()) {
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

    if (currentStatus === "pending_admin" && status === "pending_atasan") {
      const recipients = await db.all<{
        namaPegawai: string;
        jenisCuti: string;
        tglMulai: string;
        tglSelesai: string;
        jumlahHari: number;
        atasanNip: string | null;
        noWhatsappAtasan: string | null;
      }>(sql`
        SELECT u.nama AS namaPegawai, r.jenis_cuti AS jenisCuti,
               r.tgl_mulai AS tglMulai, r.tgl_selesai AS tglSelesai,
               r.jumlah_hari AS jumlahHari, a.nip AS atasanNip,
               a.no_whatsapp AS noWhatsappAtasan
        FROM leave_requests r
        JOIN users u ON u.nip = r.nip
        LEFT JOIN users a ON a.nip = u.atasan_nip
        WHERE r.id = ${numericId}
      `);
      const recipient = recipients[0];
      if (recipient?.noWhatsappAtasan && recipient.atasanNip) {
        const message = `📋 *Pengajuan Cuti Menunggu Persetujuan Atasan*\n\nPegawai: ${recipient.namaPegawai}\nJenis cuti: ${recipient.jenisCuti}\nTanggal: ${recipient.tglMulai} s/d ${recipient.tglSelesai}\nDurasi: ${recipient.jumlahHari} hari\nNo. Surat: ${body.noSurat}\n\nPengajuan telah diverifikasi Admin. Silakan buka SI CUTE untuk memberikan keputusan.`;
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
    return GET();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pengajuan gagal dihapus." },
      { status: 500 },
    );
  }
}





