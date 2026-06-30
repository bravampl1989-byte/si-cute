import { NextRequest, NextResponse } from "next/server";

import { sendWhatsApp } from "@/lib/whatsapp";
import {
  clearRuntimeFonnteToken,
  hasRuntimeFonnteToken,
  maskToken,
  setRuntimeFonnteToken,
} from "@/lib/whatsapp-settings";

export async function GET() {
  const envToken = process.env.FONNTE_TOKEN;

  return NextResponse.json({
    provider: process.env.WHATSAPP_PROVIDER ?? "fonnte",
    hasRuntimeToken: hasRuntimeFonnteToken(),
    hasEnvToken: Boolean(envToken),
    maskedEnvToken: maskToken(envToken),
  });
}

export async function POST(request: NextRequest) {
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

    setRuntimeFonnteToken(body.token);

    return NextResponse.json({
      ok: true,
      provider: "fonnte",
      hasRuntimeToken: true,
      maskedToken: maskToken(body.token),
    });
  }

  if (body.action === "clear") {
    clearRuntimeFonnteToken();

    return NextResponse.json({
      ok: true,
      provider: "fonnte",
      hasRuntimeToken: false,
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
}
