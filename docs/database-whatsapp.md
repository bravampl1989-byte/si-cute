# Database dan Notifikasi WhatsApp

Project ini disiapkan untuk deploy di Vercel, jadi database yang paling cocok adalah Turso/libSQL. Bentuknya tetap SQLite, tetapi persisten dan bisa diakses dari serverless function Vercel.

## 1. Setup Database Turso

1. Buat akun Turso.
2. Buat database baru, misalnya `cutipns`.
3. Ambil nilai berikut dari dashboard/CLI Turso:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Isi env lokal dan Vercel sesuai `.env.example`.

Install dependency:

```bash
npm install
```

Generate dan push schema:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Tabel yang dibuat:

- `users`
- `leave_quotas`
- `leave_requests`
- `approvals`
- `whatsapp_logs`

## 2. Manajemen Sisa Cuti BKN

Helper `calculateBknAnnualLeaveBalance` ada di `lib/leave-quota.ts`.

Aturan UI/backend:

- Sisa cuti tahun sebelumnya dihitung maksimal 6 hari.
- Total normal maksimal 18 hari termasuk tahun berjalan.
- Jika cuti tahunan tidak digunakan 2 tahun atau lebih berturut-turut, total maksimal 24 hari termasuk tahun berjalan.
- Penangguhan karena kepentingan dinas dipisahkan lewat `sumber = penangguhan_dinas`.

## 3. Setup WhatsApp

Pilih salah satu provider:

### Fonnte

Env:

```bash
WHATSAPP_PROVIDER=fonnte
FONNTE_TOKEN=...
```

### Wablas

Env:

```bash
WHATSAPP_PROVIDER=wablas
WABLAS_BASE_URL=https://your-server.wablas.com
WABLAS_TOKEN=...
```

Endpoint test:

```bash
curl -X POST https://domain-vercel-anda.vercel.app/api/notifications/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-api-key: isi_INTERNAL_API_KEY" \
  -d "{\"to\":\"6281234567890\",\"message\":\"Tes notifikasi CutiPNS\"}"
```

## 4. Kapan Notifikasi Dikirim

Integrasikan service `sendWhatsApp` pada event berikut:

- Pegawai mengirim cuti: kirim ke atasan langsung.
- Atasan menyetujui tahap 1: kirim ke Pejabat Berwenang.
- PyB menyetujui/menolak final: kirim ke pegawai.

Setiap pengiriman sebaiknya dicatat ke tabel `whatsapp_logs`.
