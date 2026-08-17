# Sistem Karoseri — CV. Quantum Karya Bersama

Aplikasi manajemen produksi karoseri untuk **CV. Quantum Karya Bersama** (Bengkel Quantum —
karoseri, body repair & service mobil, Sukakarya, Kabupaten Bekasi): dari permintaan penawaran,
penerbitan SPK, pemantauan tahapan pengerjaan tiap unit, sampai pencatatan termin pembayaran —
plus halaman publik agar pelanggan bisa melacak sendiri progres unitnya.

> Catatan cakupan: modul SPK saat ini dirancang untuk **pekerjaan karoseri** (pembuatan bodi yang
> berlangsung mingguan dan bertahap). Pekerjaan service mobil harian dan body repair sudah tampil
> sebagai layanan di halaman publik, tapi belum punya alur order sendiri di panel — lihat
> "Rencana lanjutan" di bawah.

## Isi sistem

**Halaman publik**

| Halaman | Fungsi |
|---|---|
| `/` | Profil perusahaan, layanan, **promo & event**, katalog model bodi, **daftar harga servis**, alur kerja, form permintaan penawaran — promo, katalog, dan daftar harga semuanya diisi dari panel, bukan ditulis di kode |
| `/lacak` | Pelanggan memantau progres unit dengan **nomor SPK + nomor rangka** |
| `/login` | Pintu masuk panel internal (tidak ditautkan mencolok, `noindex`) |

**Panel internal (`/panel`)**

| Menu | Fungsi |
|---|---|
| Dashboard | Unit aktif, unit lewat target, selesai bulan ini, nilai kontrak berjalan, pembayaran masuk, piutang, tahapan yang sedang berjalan |
| Laporan Keuangan | Laba rugi, arus kas, buku kas, pemasukan-pengeluaran, piutang, utang, persediaan — semuanya per periode dan bisa diunduh **PDF atau Word** berkop surat *(admin, keuangan, bos)* |
| SPK & Unit | Daftar + filter status + pencarian (nomor SPK/nomor rangka/pelanggan), buat SPK karoseri maupun body repair, detail SPK |
| Detail SPK | Progres berbobot, tahapan produksi (status, PIC, tanggal, catatan), termin pembayaran, sisa tagihan, cetak SPK & estimasi biaya |
| Order Servis | Servis harian: keluhan, pekerjaan, sparepart terpakai (otomatis memotong stok), mekanik, pembayaran, kartu kontrol servis |
| Pelanggan | Data PO/perusahaan/perorangan |
| Model Bodi | Katalog model, harga dasar, estimasi hari kerja, tampil/tidak di katalog publik |
| Barang & Jasa | Master sparepart & jasa: harga modal, harga jual, stok, stok minimum, stok opname, tampil/tidak di daftar harga publik |
| Kas & Pembelian | Biaya operasional (termasuk yang masih utang), setoran/penarikan modal, pembelian barang ke supplier beserta cicilan utangnya |
| Permintaan Penawaran | Lead dari form publik, status tindak lanjut, catatan internal, tombol WhatsApp |
| Karyawan | Bagian/divisi, data karyawan, gaji pokok, jenis & masa kontrak, cetak surat perjanjian kerja |
| Penggajian | Slip gaji dengan komponen yang dipilih lewat checklist; slip yang disimpan otomatis jadi biaya `gaji_upah` |
| Promo & Event | Konten promo/event/pengumuman halaman depan beserta harga coret, tombol CTA, dan masa berlakunya |
| Pengguna | Kelola akun staf & peran *(admin)* |
| Pengaturan | Tarif PPN & PPh, dasar pengenaan PPh, identitas kop surat, saldo kas awal *(admin)* |
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
| `admin` | Semuanya, termasuk kelola pengguna, pengaturan pajak, hapus data, dan lihat log aktivitas |
| `produksi` | SPK, tahapan produksi, order servis, pelanggan, model bodi, barang & jasa, promo, tindak lanjut penawaran |
| `keuangan` | Pembayaran, biaya, modal, pembelian, penggajian, order servis, laporan keuangan (tidak bisa ubah tahapan produksi) |
| `bos` | **Hanya membaca.** Laporan keuangan, kas & pembelian, dan data karyawan — tanpa menu operasional dan tanpa hak menulis apa pun (percobaan menulis ditolak 403 di server, bukan cuma disembunyikan di menu) |

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

## Identitas & data perusahaan

Semua teks identitas ada di satu berkas: `src/lib/company.ts` — nama, kontak, alamat, dan daftar
keunggulan. Data yang sekarang terisi diambil dari papan nama dan spanduk bengkel:

- **CV. Quantum Karya Bersama** — Bengkel Karoseri, Body Repair & Service Mobil
- Telepon/WhatsApp **0858-8669-2214**
- Jl. Raya Sukakarya–Sukatani, Kp. Tenjo Laut No. 1, RT 01/01, Desa Sukakarya,
  Kec. Sukakarya, Kabupaten Bekasi

Logo digambar sebagai SVG inline di `src/components/ui/Logo.tsx` (sabit tiga warna emas–biru–merah
dengan ekor berkobar) dan dipakai ulang untuk favicon di `src/app/icon.svg`. Karena SVG, logo tetap
tajam di segala ukuran dan tidak menambah request gambar.

**Masih kosong dan perlu diisi:** `email` dan `workingHours` di `src/lib/company.ts`. Keduanya
sengaja dibiarkan kosong — halaman otomatis menyembunyikan baris tersebut alih-alih menampilkan
tebakan yang salah.

## Struktur proyek

```
src/
  app/
    page.tsx            # landing publik
    lacak/              # pelacakan progres oleh pelanggan
    login/              # masuk panel
    panel/              # panel internal (dashboard, laporan, spk, servis, pelanggan, model,
                        #   barang, keuangan, penawaran, karyawan, penggajian, promo,
                        #   pengguna, pengaturan, aktivitas, akun)
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
    data/               # query SPK, order servis, dashboard, laporan, karyawan
    reports/            # model dokumen netral-format + renderer HTML/Word/PDF berkop surat
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
- **Pendapatan diakui saat pekerjaan selesai, bukan saat uang masuk.** SPK memakai `completedAt`
  dan order servis memakai `finishedAt`; tanggal itu diisi sekali saat status pertama kali menjadi
  selesai dan tidak digeser lagi ketika status maju ke "diserahkan"/"diambil" — kalau digeser,
  laporan bulan yang sudah ditutup ikut berubah.
- **Harga modal disalin ke baris transaksi**, tidak dibaca ulang dari master saat laporan dibuat.
  Naiknya harga sparepart hari ini tidak boleh mengubah laba order bulan lalu.
- **Stok bergerak lewat kartu stok, tidak pernah dihapus.** Pembatalan pembelian atau order servis
  menulis pergerakan balik tersendiri supaya jejaknya tetap bisa ditelusuri.
- **Tarif pajak disalin ke transaksi saat dibuat.** Mengubah tarif PPN di Pengaturan tidak
  mengubah order yang sudah terlanjur diterbitkan.

## Tiga lini pekerjaan

Ketiganya sudah bersistem, masing-masing dengan alur yang sesuai sifat pekerjaannya:

- **Karoseri** — SPK bertahap dengan template tahapan per tipe unit, progres berbobot, termin
  pembayaran.
- **Body repair** — SPK bernomor `BR/YYYYMM/NNN` dengan tahapan lebih pendek (bongkar, ketok,
  dempul, epoxy, cat, poles, QC) dan field klaim asuransi (perusahaan, nomor polis, surveyor).
- **Service mobil** — order servis harian bernomor `SRV/YYYYMM/NNN`: keluhan, diagnosa, baris
  pekerjaan & sparepart, mekanik, pembayaran, plus kartu kontrol servis per nomor polisi.

## Dokumen cetak

Semua laporan dan dokumen transaksi dibangun dari satu model dokumen netral-format
(`src/lib/reports/document.ts`) lalu dirender ke **HTML (layar), Word, dan PDF** dengan kop surat
yang sama. Dokumen transaksi yang tersedia: SPK, estimasi biaya, slip pembayaran, bukti
pembayaran/kuitansi, kartu kontrol servis, surat hutang, slip gaji, dan surat perjanjian kerja.
Templat Word/Excel kosong untuk diisi tangan ada di `templates/`.
