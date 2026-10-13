import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config({ path: ".env.local" });
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  const result = await client.execute(
    "UPDATE leave_requests SET status = 'pending_admin', updated_at = CURRENT_TIMESTAMP WHERE id = 27",
  );
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  console.error(error.cause);
}
