import { relations, sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  nip: text("nip").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  nama: text("nama").notNull(),
  peran: text("peran", {
    enum: [
      "admin_hr",
      "pegawai",
      "pppk",
      "atasan_langsung",
      "pejabat_berwenang",
    ],
  }).notNull(),
  noWhatsapp: text("no_whatsapp").notNull(),
  atasanNip: text("atasan_nip").references((): AnySQLiteColumn => users.nip),
  aktif: integer("aktif", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userRoles = sqliteTable(
  "user_roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nip: text("nip")
      .notNull()
      .references(() => users.nip, { onDelete: "cascade" }),
    peran: text("peran", {
      enum: [
        "admin_hr",
        "pegawai",
        "pppk",
        "atasan_langsung",
        "pejabat_berwenang",
      ],
    }).notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nipPeranIdx: uniqueIndex("user_roles_nip_peran_idx").on(
      table.nip,
      table.peran,
    ),
  }),
);

export const leaveQuotas = sqliteTable(
  "leave_quotas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nip: text("nip")
      .notNull()
      .references(() => users.nip, { onDelete: "cascade" }),
    tahun: integer("tahun").notNull(),
    kuotaTotal: integer("kuota_total").notNull().default(12),
    sisaKuota: integer("sisa_kuota").notNull().default(12),
    sumber: text("sumber", {
      enum: ["tahun_berjalan", "sisa_tahun_lalu", "penangguhan_dinas"],
    })
      .notNull()
      .default("tahun_berjalan"),
    kadaluarsaPada: text("kadaluarsa_pada"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nipTahunIdx: uniqueIndex("leave_quotas_nip_tahun_idx").on(
      table.nip,
      table.tahun,
      table.sumber,
    ),
  }),
);

export const employeeNonAnnualLeaves = sqliteTable(
  "employee_nonannual_leaves",
  {
    nip: text("nip")
      .notNull()
      .references(() => users.nip, { onDelete: "cascade" }),
    jenisCuti: text("jenis_cuti", {
      enum: [
        "besar",
        "sakit",
        "melahirkan",
        "alasan_penting",
        "di_luar_tanggungan_negara",
      ],
    }).notNull(),
    jumlahHari: integer("jumlah_hari").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nipJenisIdx: uniqueIndex("employee_nonannual_leaves_nip_jenis_idx").on(
      table.nip,
      table.jenisCuti,
    ),
  }),
);

export const leaveRequests = sqliteTable("leave_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nip: text("nip")
    .notNull()
    .references(() => users.nip, { onDelete: "cascade" }),
  jenisCuti: text("jenis_cuti", {
    enum: [
      "tahunan",
      "besar",
      "sakit",
      "melahirkan",
      "alasan_penting",
      "di_luar_tanggungan_negara",
    ],
  }).notNull(),
  tglMulai: text("tgl_mulai").notNull(),
  tglSelesai: text("tgl_selesai").notNull(),
  jumlahHari: integer("jumlah_hari").notNull(),
  alasan: text("alasan").notNull(),
  alamatCuti: text("alamat_cuti").notNull(),
  lampiranUrl: text("lampiran_url"),
  noSurat: text("no_surat"),
  status: text("status", {
    enum: [
      "pending_admin", "pending_atasan", "pending_pejabat",
      "disetujui",
      "ditolak",
      "perbaikan",
    ],
  })
    .notNull()
    .default("pending_admin"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id")
    .notNull()
    .references(() => leaveRequests.id, { onDelete: "cascade" }),
  approverNip: text("approver_nip")
    .notNull()
    .references(() => users.nip),
  tahapan: text("tahapan", {
    enum: ["tingkat_0_admin", "tingkat_1_atasan", "tingkat_2_pejabat"],
  }).notNull(),
  keputusan: text("keputusan", {
    enum: ["disetujui", "ditolak", "perbaikan"],
  }).notNull(),
  catatan: text("catatan"),
  timestamp: text("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const whatsappLogs = sqliteTable("whatsapp_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id").references(() => leaveRequests.id, {
    onDelete: "set null",
  }),
  targetNip: text("target_nip").references(() => users.nip, {
    onDelete: "set null",
  }),
  noWhatsapp: text("no_whatsapp").notNull(),
  provider: text("provider").notNull(),
  message: text("message").notNull(),
  status: text("status", {
    enum: ["queued", "sent", "failed"],
  }).notNull(),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  quotas: many(leaveQuotas),
  requests: many(leaveRequests),
  approvals: many(approvals),
  roles: many(userRoles),
  atasan: one(users, {
    fields: [users.atasanNip],
    references: [users.nip],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.nip],
    references: [users.nip],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [leaveRequests.nip],
    references: [users.nip],
  }),
  approvals: many(approvals),
  whatsappLogs: many(whatsappLogs),
}));


