import { getDatabaseFonnteToken, getRuntimeFonnteToken } from "@/lib/whatsapp-settings";

type SendWhatsAppInput = {
  to: string;
  message: string;
};

type SendWhatsAppResult = {
  provider: string;
  ok: boolean;
  providerMessageId?: string;
  error?: string;
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
    target: normalizeWhatsAppTarget(to),
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
  const providerAccepted = isProviderAccepted(raw);

  return {
    provider: "fonnte",
    ok: response.ok && providerAccepted,
    providerMessageId: extractString(raw, "id"),
    error:
      response.ok && providerAccepted
        ? undefined
        : extractProviderError(raw) ?? `Fonnte menolak pengiriman (HTTP ${response.status}).`,
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
      phone: normalizeWhatsAppTarget(to),
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

function normalizeWhatsAppTarget(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function isProviderAccepted(raw: unknown) {
  if (typeof raw !== "object" || raw === null || !("status" in raw)) {
    return true;
  }
  const status = (raw as Record<string, unknown>).status;
  if (typeof status === "boolean") return status;
  if (typeof status === "number") return status === 1 || status === 200;
  if (typeof status === "string") {
    return ["true", "1", "ok", "success"].includes(status.toLowerCase());
  }
  return true;
}

function extractProviderError(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  for (const key of ["reason", "message", "detail", "error"]) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key];
    }
  }
  return undefined;
}
