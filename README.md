# Sistem Karoseri — CV. Quantum Karya Bersama

Aplikasi manajemen produksi karoseri: dari permintaan penawaran, penerbitan SPK, pemantauan
tahapan pengerjaan tiap unit, sampai pencatatan termin pembayaran — plus halaman publik agar
pelanggan bisa melacak sendiri progres unitnya.

## Isi sistem

**Halaman publik**

| Halaman | Fungsi |
|---|---|
| `/` | Profil perusahaan, layanan, katalog model bodi (dari database), alur kerja, form permintaan penawaran |
| `/lacak` | Pelanggan memantau progres unit dengan **nomor SPK + nomor rangka** |
| `/login` | Pintu masuk panel internal (tidak ditautkan mencolok, `noindex`) |

**Panel internal (`/panel`)**

| Menu | Fungsi |
|---|---|
| Dashboard | Unit aktif, unit lewat target, selesai bulan ini, nilai kontrak berjalan, pembayaran masuk, piutang, tahapan yang sedang berjalan |
| SPK & Unit | Daftar + filter status + pencarian (nomor SPK/nomor rangka/pelanggan), buat SPK, detail SPK |
| Detail SPK | Progres berbobot, tahapan produksi (status, PIC, tanggal, catatan), termin pembayaran, sisa tagihan |
| Pelanggan | Data PO/perusahaan/perorangan |
| Model Bodi | Katalog model, harga dasar, estimasi hari kerja, tampil/tidak di katalog publik |
| Permintaan Penawaran | Lead dari form publik, status tindak lanjut, catatan internal, tombol WhatsApp |
| Pengguna | Kelola akun staf & peran *(admin)* |
| Log Aktivitas | 100 perubahan data terakhir beserta pelakunya *(admin)* |
| Akun Saya | Ganti password sendiri |

### Cara kerja SPK

1. SPK dibuat dengan nomor otomatis berformat `SPK/YYYYMM/NNN` (urut per bulan).
2. Saat disimpan, **tahapan produksi dibuat otomatis** dari template sesuai tipe unit —
   bus, box, wingbox, dump, dan tangki punya urutan tahapan sendiri, masing-masing dengan bobot
   yang totalnya 100.
3. Progres unit = bobot tahapan `selesai` + setengah bobot tahapan `dikerjakan`.
4. Status SPK ikut menyesuaikan sendiri saat tahapan diperbarui (antrian → produksi → QC →
   selesai). Status `diserahkan` dan `batal` hanya berubah lewat keputusan manusia.
5. Pelanggan memantau progres yang sama di `/lacak` — tanpa melihat nilai kontrak maupun
   pembayaran.

### Peran pengguna

| Peran | Wewenang |
|---|---|
| `admin` | Semuanya, termasuk kelola pengguna, hapus data, dan lihat log aktivitas |
| `produksi` | SPK, tahapan produksi, pelanggan, model bodi, tindak lanjut penawaran |
| `keuangan` | Catat/hapus pembayaran, pelanggan, tindak lanjut penawaran (tidak bisa ubah tahapan/SPK) |

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) — D1 (database), KV (rate limit form publik)
- **Drizzle ORM** untuk skema & migrasi D1
- Autentikasi sendiri: password di-hash PBKDF2 (Web Crypto, tanpa dependency), sesi tersimpan
  di D1 sehingga bisa dicabut kapan saja

## Menjalankan secara lokal

```bash
npm install
npm run generate:seed          # membuat seed/seed.sql (katalog model + 1 akun admin)
npm run db:migrate:local       # membuat skema di D1 lokal
npm run db:seed:local          # mengisi data awal
npm run cf:build && npx wrangler dev   # jalankan seperti di Cloudflare (D1/KV aktif)
```

`npm run generate:seed` mencetak password admin acak **sekali saja** ke terminal kalau
`ADMIN_BOOTSTRAP_PASSWORD` tidak diisi. Simpan saat itu juga, lalu ganti lewat Panel → Akun Saya.

`npm run dev` (Next dev biasa) tidak punya binding D1, jadi halaman yang membaca database akan
error — pakai `wrangler dev` untuk pengembangan sehari-hari.

## Setup Cloudflare (sekali saja)

```bash
wrangler login
wrangler d1 create quantum_db          # salin database_id ke wrangler.jsonc
wrangler kv namespace create QUANTUM_KV # salin id ke wrangler.jsonc
wrangler r2 bucket create quantum-assets
```

Dua nilai bertanda `REPLACE_WITH_...` di `wrangler.jsonc` wajib diganti sebelum deploy pertama.

## Deploy otomatis (GitHub Actions)

`.github/workflows/deploy.yml` menjalankan typecheck → build → migrasi D1 → seed → deploy setiap
push ke `main`. Secret yang perlu diisi di **Settings → Secrets and variables → Actions**:

| Secret | Wajib | Keterangan |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ya | Izin **Workers Scripts: Edit**, **D1: Edit**, **Workers KV Storage: Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | ya | Account ID Cloudflare |
| `ADMIN_BOOTSTRAP_EMAIL` | disarankan | Email admin pertama |
| `ADMIN_BOOTSTRAP_PASSWORD` | disarankan | Password admin pertama — hanya hash PBKDF2-nya yang masuk database |
| `NOTIFY_WEBHOOK_URL` | tidak | Webhook notifikasi saat ada permintaan penawaran masuk |

`seed/seed.sql` sengaja tidak di-commit (ada di `.gitignore`) karena memuat hash password; file
itu dibuat ulang di CI setiap deploy.

## Yang perlu diisi sebelum situs dipublikasikan

Ubah `src/lib/company.ts` — nomor telepon, WhatsApp, email, alamat, dan jam kerja di sana masih
placeholder. Seluruh halaman publik membaca dari berkas itu, jadi cukup satu tempat.

## Struktur proyek

```
src/
  app/
    page.tsx            # landing publik
    lacak/              # pelacakan progres oleh pelanggan
    login/              # masuk panel
    panel/              # panel internal (dashboard, spk, pelanggan, model, penawaran, pengguna)
    api/
      auth/             # login, logout, ganti password
      leads/            # form penawaran publik (rate limit via KV)
      lacak/            # pelacakan publik (butuh SPK + nomor rangka)
      panel/            # endpoint internal, dijaga peran
  components/
    site/               # navigasi & form halaman publik
    panel/              # komponen panel internal
    ui/                 # badge, progress bar, kartu statistik
  lib/
    karoseri/           # domain: tipe unit, status, template tahapan, preset model
    auth/               # password (PBKDF2), sesi, guard peran
    data/               # query SPK & dashboard
    db/                 # skema & klien Drizzle
migrations/             # migrasi D1 (drizzle-kit generate)
scripts/generate-seed.ts
```

## Catatan teknis

- **Iterasi PBKDF2 dikunci di 100.000.** Cloudflare Workers menolak angka di atas itu saat
  verifikasi; hash yang dibuat dengan iterasi lebih tinggi lolos di dev lokal tapi gagal login di
  produksi. Angka ini sama persis di `src/lib/auth/password.ts` dan `scripts/generate-seed.ts`.
- **Nominal rupiah disimpan sebagai integer** (rupiah penuh, tanpa sen) agar penjumlahan piutang
  bebas galat pembulatan.
- **Pelacakan publik butuh nomor rangka.** Nomor SPK berurutan dan mudah ditebak, jadi nomor
  rangka dipakai sebagai kunci verifikasi, dan responsnya tidak memuat data keuangan.
- **Menghapus data yang masih dipakai ditolak**, bukan dipaksakan: pelanggan yang masih punya SPK
  dan model yang sudah dipakai SPK tidak bisa dihapus (model cukup dinonaktifkan) supaya riwayat
  produksi tetap utuh.
