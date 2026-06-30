import { NextRequest, NextResponse } from "next/server";

import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const apiKey = process.env.INTERNAL_API_KEY;

  if (apiKey && request.headers.get("x-api-key") !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    to?: string;
    message?: string;
  };

  if (!body.to || !body.message) {
    return NextResponse.json(
      { error: "Fields `to` and `message` are required" },
      { status: 400 },
    );
  }

  const result = await sendWhatsApp({
    to: body.to,
    message: body.message,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
