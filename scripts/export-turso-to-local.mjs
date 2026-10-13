import "dotenv/config";

import { unlink } from "node:fs/promises";
import { createClient } from "@libsql/client";

const targetPath = "si-cute-local.db";
const remoteUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!remoteUrl?.startsWith("libsql://") || !authToken) {
  throw new Error("Koneksi Turso belum dikonfigurasi.");
}

await unlink(targetPath).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});

const remote = createClient({ url: remoteUrl, authToken });
const local = createClient({ url: `file:${targetPath}` });

try {
  await local.execute("PRAGMA foreign_keys = OFF");

  const objects = await remote.execute(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
    ORDER BY CASE type
      WHEN 'table' THEN 1
      WHEN 'index' THEN 2
      WHEN 'trigger' THEN 3
      WHEN 'view' THEN 4
      ELSE 5
    END, name
  `);

  const tables = objects.rows.filter((row) => row.type === "table");
  const remainingObjects = objects.rows.filter((row) => row.type !== "table");

  for (const table of tables) {
    await local.execute(String(table.sql));

    const tableName = String(table.name);
    const quotedTable = `"${tableName.replaceAll('"', '""')}"`;
    const rows = await remote.execute(`SELECT * FROM ${quotedTable}`);

    if (rows.rows.length > 0) {
      const columns = rows.columns.map(
        (column) => `"${String(column).replaceAll('"', '""')}"`,
      );
      const placeholders = columns.map(() => "?").join(", ");
      const insertSql = `INSERT INTO ${quotedTable} (${columns.join(", ")}) VALUES (${placeholders})`;

      for (let offset = 0; offset < rows.rows.length; offset += 100) {
        const chunk = rows.rows.slice(offset, offset + 100);
        await local.batch(
          chunk.map((row) => ({
            sql: insertSql,
            args: rows.columns.map((column) => row[column]),
          })),
          "write",
        );
      }
    }

    console.log(`${tableName}: ${rows.rows.length}`);
  }

  for (const object of remainingObjects) {
    await local.execute(String(object.sql));
  }

  await local.execute("PRAGMA foreign_keys = ON");
  await local.execute("PRAGMA optimize");
  console.log(`Database lokal dibuat: ${targetPath}`);
} finally {
  remote.close();
  local.close();
}
