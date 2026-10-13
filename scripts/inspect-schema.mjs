import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config({ path: ".env.local" });
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const [users, approvals, leaveRequests, tableSql, tables] = await Promise.all([
  client.execute("PRAGMA table_info(users)"),
  client.execute("PRAGMA table_info(approvals)"),
  client.execute("PRAGMA table_info(leave_requests)"),
  client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='leave_requests'"),
  client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"),
]);
console.log(JSON.stringify({ users: users.rows, approvals: approvals.rows, leaveRequests: leaveRequests.rows, tableSql: tableSql.rows, tables: tables.rows }, null, 2));
