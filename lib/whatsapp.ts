import { getDatabaseFonnteToken, getRuntimeFonnteToken } from "@/lib/whatsapp-settings";

type SendWhatsAppInput = {
  to: string;
  message: string;
};

type SendWhatsAppResult = {
  provider: string;
  ok: boolean;
  providerMessageId?: string;
  raw: unknown;
};

const provider = process.env.WHATSAPP_PROVIDER ?? "fonnte";

export async function sendWhatsApp({
  to,
  message,
}: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  if (provider === "wablas") {
    return sendViaWablas({ to, message });
  }

  return sendViaFonnte({ to, message });
}

async function sendViaFonnte({
  to,
  message,
}: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const token =
    getRuntimeFonnteToken() ??
    (await getDatabaseFonnteToken()) ??
    process.env.FONNTE_TOKEN;

  if (!token) {
    throw new Error("FONNTE_TOKEN is required when WHATSAPP_PROVIDER=fonnte");
  }

  const body = new URLSearchParams({
    target: to,
    message,
  });

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body,
  });
  const raw = await response.json().catch(() => null);

  return {
    provider: "fonnte",
    ok: response.ok,
    providerMessageId: extractString(raw, "id"),
    raw,
  };
}

async function sendViaWablas({
  to,
  message,
}: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const baseUrl = process.env.WABLAS_BASE_URL;
  const token = process.env.WABLAS_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "WABLAS_BASE_URL and WABLAS_TOKEN are required when WHATSAPP_PROVIDER=wablas",
    );
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/send-message`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: to,
      message,
    }),
  });
  const raw = await response.json().catch(() => null);

  return {
    provider: "wablas",
    ok: response.ok,
    providerMessageId: extractString(raw, "id"),
    raw,
  };
}

function extractString(value: unknown, key: string) {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : undefined;
}
