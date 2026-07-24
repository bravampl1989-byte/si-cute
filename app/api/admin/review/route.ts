import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { sendWhatsApp } from "@/lib/whatsapp";
import { saveRequestSignature } from "@/lib/request-signatures";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      requestId?: number;
      action?: "setuju" | "tolak" | "tunda";
      noSurat?: string;
      catatan?: string;
      adminNip?: string;
      signature?: string;
    };

    if (!body.requestId || !body.action || !body.adminNip) {
      return NextResponse.json(
        { error: "Data keputusan belum lengkap." },
        { status: 400 },
      );
    }
    if (body.action === "setuju" && !body.noSurat?.trim()) {
      return NextResponse.json(
        { error: "Nomor surat wajib diisi untuk keputusan setuju." },
        { status: 400 },
      );
    }
    if (body.action === "setuju" && !body.signature?.trim()) {
      return NextResponse.json(
        { error: "Paraf Admin wajib diisi untuk keputusan setuju." },
        { status: 400 },
      );
    }

    const newStatus =
      body.action === "setuju"
        ? "pending_atasan"
        : body.action === "tolak"
          ? "ditolak"
          : "pending_admin";

    const decision =
      body.action === "setuju"
        ? "disetujui"
        : body.action === "tolak"
          ? "ditolak"
          : "perbaikan";

    // Update leave request
    const updateFields = [
      "status = " + JSON.stringify(newStatus),
      "updated_at = CURRENT_TIMESTAMP",
    ];
    if (body.noSurat) {
      updateFields.push("no_surat = " + JSON.stringify(body.noSurat));
    }

    await db.run(sql.raw(`
      UPDATE leave_requests
      SET ${updateFields.join(", ")}
      WHERE id = ${body.requestId}
    `));

    // Record approval
    await db.run(sql`
      INSERT INTO approvals
        (request_id, approver_nip, tahapan, keputusan, catatan, timestamp)
      VALUES
        (${body.requestId}, ${body.adminNip}, 'tingkat_0_admin', ${decision},
         ${body.catatan ?? ""}, CURRENT_TIMESTAMP)
    `);
    if (body.action === "setuju" && body.signature) {
      await saveRequestSignature(
        body.requestId,
        "admin",
        body.adminNip,
        body.signature,
      );
    }

    // Send WA notification if approved (forwarded to atasan)
    if (body.action === "setuju") {
      try {
        // Get request details and atasan info
        const rows = await db.all<{
          nama_pegawai: string;
          nip_pegawai: string;
          jenis_cuti: string;
          tgl_mulai: string;
          tgl_selesai: string;
          jumlah_hari: number;
          no_surat: string | null;
          nama_atasan: string;
          no_whatsapp_atasan: string;
        }>(sql`
          SELECT u.nama AS nama_pegawai, r.nip AS nip_pegawai,
                 r.jenis_cuti, r.tgl_mulai, r.tgl_selesai, r.jumlah_hari,
                 r.no_surat,
                 a.nama AS nama_atasan, a.no_whatsapp AS no_whatsapp_atasan
          FROM leave_requests r
          JOIN users u ON u.nip = r.nip
          LEFT JOIN users a ON a.nip = u.atasan_nip
          WHERE r.id = ${body.requestId}
        `);

        if (rows.length > 0 && rows[0].no_whatsapp_atasan) {
          const row = rows[0];
          const noSuratLine = row.no_surat ? `\nNo. Surat: ${row.no_surat}` : "";
          const message = `📋 *Pengajuan Cuti Perlu Ditinjau*

Pegawai: ${row.nama_pegawai}
NIP: ${row.nip_pegawai}
Jenis Cuti: ${row.jenis_cuti}
Tanggal: ${row.tgl_mulai} s/d ${row.tgl_selesai}
Jumlah Hari: ${row.jumlah_hari} hari${noSuratLine}

Telah diverifikasi admin. Mohon tinjau dan putuskan.`;

          await sendWhatsApp({
            to: row.no_whatsapp_atasan,
            message,
          });
        }
      } catch (waError) {
        console.error("WA notification failed:", waError);
      }
    }

    invalidateDashboardCache();
    return NextResponse.json({ ok: true, newStatus });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Keputusan gagal diproses.",
      },
      { status: 500 },
    );
  }
}
