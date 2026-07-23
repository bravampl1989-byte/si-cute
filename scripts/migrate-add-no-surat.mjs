import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const columns = await client.execute("PRAGMA table_info(leave_requests)");
if (!columns.rows.some((column) => column.name === "no_surat")) {
  await client.execute("ALTER TABLE leave_requests ADD COLUMN no_surat TEXT");
  console.log("Kolom no_surat berhasil ditambahkan.");
} else {
  console.log("Kolom no_surat sudah tersedia.");
}
