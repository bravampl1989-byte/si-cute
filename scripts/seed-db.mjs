import "dotenv/config";

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const url = process.env.TURSO_DATABASE_URL;

if (!url) {
  throw new Error("TURSO_DATABASE_URL belum diatur");
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const demoPasswordHash = await bcrypt.hash("password", 12);
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error("SEED_ADMIN_PASSWORD belum diatur");
}

const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

const users = [
  {
    nip: "197705182001122001",
    nama: "Dewi Lestari",
    peran: "pejabat_berwenang",
    roles: ["pegawai", "pejabat_berwenang"],
    noWhatsapp: "6281111111101",
    atasanNip: null,
    passwordHash: demoPasswordHash,
  },
  {
    nip: "197902142002121001",
    nama: "Siti Rahmawati",
    peran: "admin_hr",
    roles: ["admin_hr"],
    noWhatsapp: "6281111111102",
    atasanNip: null,
    passwordHash: adminPasswordHash,
  },
  {
    nip: "198503172008011002",
    nama: "Arif Hidayat",
    peran: "atasan_langsung",
    roles: ["pegawai", "atasan_langsung"],
    noWhatsapp: "6281111111103",
    atasanNip: "197705182001122001",
    passwordHash: demoPasswordHash,
  },
  {
    nip: "198904122014032001",
    nama: "Rani Kusuma",
    peran: "pegawai",
    roles: ["pegawai"],
    noWhatsapp: "6281111111104",
    atasanNip: "198503172008011002",
    passwordHash: demoPasswordHash,
  },
  {
    nip: "199102022015041003",
    nama: "Bagas Pratama",
    peran: "pegawai",
    roles: ["pegawai", "atasan_langsung"],
    noWhatsapp: "6281111111105",
    atasanNip: "198503172008011002",
    passwordHash: demoPasswordHash,
  },
  {
    nip: "198811232012122002",
    nama: "Nadia Putri",
    peran: "pppk",
    roles: ["pppk"],
    noWhatsapp: "6281111111106",
    atasanNip: "198503172008011002",
    passwordHash: demoPasswordHash,
  },
];

for (const user of users) {
  await client.execute({
    sql: `
      INSERT INTO users (
        nip, password_hash, nama, peran, no_whatsapp, atasan_nip, aktif
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(nip) DO UPDATE SET
        password_hash = excluded.password_hash,
        nama = excluded.nama,
        peran = excluded.peran,
        no_whatsapp = excluded.no_whatsapp,
        atasan_nip = excluded.atasan_nip,
        aktif = 1
    `,
    args: [
      user.nip,
      user.passwordHash,
      user.nama,
      user.peran,
      user.noWhatsapp,
      user.atasanNip,
    ],
  });

  for (const role of user.roles) {
    await client.execute({
      sql: `
        INSERT OR IGNORE INTO user_roles (nip, peran)
        VALUES (?, ?)
      `,
      args: [user.nip, role],
    });
  }
}

const quotaRows = [
  ["198904122014032001", 2026, 12, 9, "tahun_berjalan", null],
  ["198904122014032001", 2025, 12, 4, "sisa_tahun_lalu", "2026-12-31"],
  ["198904122014032001", 2024, 12, 2, "sisa_tahun_lalu", "2026-12-31"],
  ["199102022015041003", 2026, 12, 8, "tahun_berjalan", null],
  ["199102022015041003", 2025, 12, 1, "sisa_tahun_lalu", "2026-12-31"],
  ["199102022015041003", 2024, 12, 0, "sisa_tahun_lalu", "2026-12-31"],
  ["198811232012122002", 2026, 12, 10, "tahun_berjalan", null],
  ["198811232012122002", 2025, 12, 6, "sisa_tahun_lalu", "2026-12-31"],
  ["198811232012122002", 2024, 12, 3, "sisa_tahun_lalu", "2026-12-31"],
  ["197705182001122001", 2026, 12, 12, "tahun_berjalan", null],
  ["197705182001122001", 2025, 12, 6, "sisa_tahun_lalu", "2026-12-31"],
  ["197705182001122001", 2024, 12, 6, "sisa_tahun_lalu", "2026-12-31"],
];

for (const row of quotaRows) {
  await client.execute({
    sql: `
      INSERT INTO leave_quotas (
        nip, tahun, kuota_total, sisa_kuota, sumber, kadaluarsa_pada
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(nip, tahun, sumber) DO UPDATE SET
        kuota_total = excluded.kuota_total,
        sisa_kuota = excluded.sisa_kuota,
        kadaluarsa_pada = excluded.kadaluarsa_pada,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: row,
  });
}

const requestCount = await client.execute(
  "SELECT COUNT(*) AS total FROM leave_requests",
);

if (Number(requestCount.rows[0]?.total ?? 0) === 0) {
  const request1 = await client.execute({
    sql: `
      INSERT INTO leave_requests (
        nip, jenis_cuti, tgl_mulai, tgl_selesai, jumlah_hari,
        alasan, alamat_cuti, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      "198904122014032001",
      "tahunan",
      "2026-05-18",
      "2026-05-22",
      5,
      "Keperluan keluarga di luar kota",
      "Jl. Merdeka No. 18, Bandung",
      "pending_atasan",
    ],
  });

  const request2 = await client.execute({
    sql: `
      INSERT INTO leave_requests (
        nip, jenis_cuti, tgl_mulai, tgl_selesai, jumlah_hari,
        alasan, alamat_cuti, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      "199102022015041003",
      "sakit",
      "2026-05-13",
      "2026-05-15",
      3,
      "Pemulihan pasca tindakan medis",
      "Jl. Kenanga No. 2, Sleman",
      "pending_pejabat",
    ],
  });

  await client.execute({
    sql: `
      INSERT INTO approvals (
        request_id, approver_nip, tahapan, keputusan, catatan
      ) VALUES (?, ?, ?, ?, ?)
    `,
    args: [
      Number(request2.lastInsertRowid),
      "198503172008011002",
      "tingkat_1_atasan",
      "disetujui",
      "Dokumen pendukung telah diperiksa",
    ],
  });

  console.log(
    `Pengajuan awal dibuat: ${request1.lastInsertRowid}, ${request2.lastInsertRowid}`,
  );
}

const counts = {};
for (const table of [
  "users",
  "leave_quotas",
  "leave_requests",
  "approvals",
  "whatsapp_logs",
]) {
  const result = await client.execute(`SELECT COUNT(*) AS total FROM ${table}`);
  counts[table] = Number(result.rows[0]?.total ?? 0);
}

console.table(counts);
client.close();
