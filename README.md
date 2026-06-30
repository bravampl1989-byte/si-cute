# CutiPNS Frontend

Prototype frontend Next.js untuk pengajuan dan persetujuan cuti PNS sesuai PRD.

## Stack

- Next.js App Router
- Tailwind CSS
- shadcn/ui-style components
- lucide-react icons

## Run

Install dependencies, lalu jalankan:

```bash
npm run dev
```

Halaman utama tersedia di `http://localhost:3000`.

## Build

Sebelum deploy, jalankan:

```bash
npm run build
```

Jika build berhasil, aplikasi siap dipasang ke hosting Next.js seperti Vercel.

## Database lokal

Database development menggunakan libSQL lokal di `local.db`.

```bash
npm run db:push
npm run db:seed
```

Periksa koneksi setelah server berjalan:

```text
http://localhost:3000/api/health/database
```

Login demo menggunakan password `password`. NIP contoh:

- Admin Pembuat Daftar Cuti: `197902142002121001`
- Pejabat Berwenang: `197705182001122001`
- Atasan Langsung: `198503172008011002`
- Pegawai: `198904122014032001`

## Deploy ke Vercel

1. Push project ke GitHub.
2. Buka Vercel, pilih `Add New Project`, lalu import repository.
3. Framework otomatis terdeteksi sebagai Next.js.
4. Tambahkan Environment Variables:

```text
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
WHATSAPP_PROVIDER=fonnte
FONNTE_TOKEN=your_fonnte_token
INTERNAL_API_KEY=replace_with_random_secret
SEED_ADMIN_PASSWORD=replace_with_secure_admin_password
```

5. Deploy.
6. Setelah deploy, jalankan migrasi database dari lokal:

```bash
npm run db:push
npm run db:seed
```

Pastikan `.env` lokal berisi kredensial Turso production sebelum menjalankan perintah database.

Akun admin hasil seed:

```text
NIP: 197902142002121001
Peran: Admin Pembuat Daftar Cuti
Password: sesuai nilai SEED_ADMIN_PASSWORD
```
