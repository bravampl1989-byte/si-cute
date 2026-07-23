import { sql } from "drizzle-orm";
import { client, db } from "@/lib/db/client";

let ready: Promise<void> | undefined;
export async function ensureRequestSignatures() {
  ready ??= client.execute(`CREATE TABLE IF NOT EXISTS request_signatures (request_id INTEGER NOT NULL, role TEXT NOT NULL, signer_nip TEXT NOT NULL, signature_data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (request_id, role))`).then(() => undefined);
  await ready;
}
export async function saveRequestSignature(requestId: number, role: "pemohon" | "atasan" | "pyb", signerNip: string, signature: string) {
  await ensureRequestSignatures();
  await db.run(sql`INSERT INTO request_signatures (request_id, role, signer_nip, signature_data) VALUES (${requestId}, ${role}, ${signerNip}, ${signature}) ON CONFLICT(request_id, role) DO UPDATE SET signer_nip = excluded.signer_nip, signature_data = excluded.signature_data`);
}
