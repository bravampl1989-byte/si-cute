import { NextRequest, NextResponse } from "next/server";

import { sendWhatsApp } from "@/lib/whatsapp";
import {
  clearDatabaseFonnteToken,
  getDatabaseFonnteToken,
  hasRuntimeFonnteToken,
  maskToken,
  saveDatabaseFonnteToken,
} from "@/lib/whatsapp-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [databaseToken, envToken] = await Promise.all([
      getDatabaseFonnteToken(),
      Promise.resolve(process.env.FONNTE_TOKEN),
    ]);

    return NextResponse.json({
      provider: process.env.WHATSAPP_PROVIDER ?? "fonnte",
      hasDatabaseToken: Boolean(databaseToken),
      maskedDatabaseToken: maskToken(databaseToken),
      hasRuntimeToken: hasRuntimeFonnteToken(),
      hasEnvToken: Boolean(envToken),
      maskedEnvToken: maskToken(envToken),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status token belum bisa dibaca." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: "save" | "clear" | "test";
      token?: string;
      to?: string;
      message?: string;
    };

    if (body.action === "save") {
      if (!body.token || body.token.trim().length < 8) {
        return NextResponse.json(
          { error: "Token Fonnte minimal 8 karakter." },
          { status: 400 },
        );
      }

      await saveDatabaseFonnteToken(body.token);

      return NextResponse.json({
        ok: true,
        provider: "fonnte",
        hasDatabaseToken: true,
        maskedToken: maskToken(body.token),
      });
    }

    if (body.action === "clear") {
      await clearDatabaseFonnteToken();

      return NextResponse.json({
        ok: true,
        provider: "fonnte",
        hasDatabaseToken: false,
        hasEnvToken: Boolean(process.env.FONNTE_TOKEN),
        maskedEnvToken: maskToken(process.env.FONNTE_TOKEN),
      });
    }

    if (body.action === "test") {
      if (!body.to || !body.message) {
        return NextResponse.json(
          { error: "Nomor tujuan dan pesan wajib diisi." },
          { status: 400 },
        );
      }

      const result = await sendWhatsApp({
        to: body.to,
        message: body.message,
      });

      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pengaturan WhatsApp gagal diproses." },
      { status: 500 },
    );
  }
}
