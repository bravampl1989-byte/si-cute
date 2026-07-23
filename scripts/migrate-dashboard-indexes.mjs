import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const indexes = [
  "CREATE INDEX IF NOT EXISTS leave_requests_nip_created_idx ON leave_requests(nip, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS leave_requests_status_created_idx ON leave_requests(status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS approvals_request_timestamp_idx ON approvals(request_id, timestamp DESC)",
  "CREATE INDEX IF NOT EXISTS users_atasan_nip_idx ON users(atasan_nip)",
  "CREATE INDEX IF NOT EXISTS user_roles_nip_idx ON user_roles(nip)",
];

for (const statement of indexes) {
  await client.execute(statement);
}

console.log("Index dashboard Turso berhasil dipastikan.");
