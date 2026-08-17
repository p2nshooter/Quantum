#!/usr/bin/env bash
#
# Bootstrap sekali jalan: membuat database D1 + namespace KV, menuliskan id-nya
# ke wrangler.jsonc, menjalankan migrasi, mengisi data awal, lalu deploy.
#
# Pakai:
#   wrangler login                 # sekali saja, buka browser
#   bash scripts/setup-cloudflare.sh
#
# Setelah selesai, alamat publiknya dicetak di akhir output —
# https://quantum-karoseri.<subdomain>.workers.dev
set -euo pipefail

cd "$(dirname "$0")/.."

if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "Belum login ke Cloudflare. Jalankan dulu: npx wrangler login"
  exit 1
fi

# Pembuatan D1 + KV dan penulisan id-nya ke wrangler.jsonc dipakai bersama CI,
# jadi logikanya tinggal satu tempat di skrip berikut.
echo "==> 1/4 Menyiapkan resource Cloudflare (D1 + KV)"
bash scripts/ensure-cloudflare-resources.sh

echo "==> 2/4 Migrasi skema ke D1"
npx wrangler d1 migrations apply quantum_db --remote

echo "==> 3/4 Mengisi data awal (katalog + akun admin)"
npm run generate:seed
npx wrangler d1 execute quantum_db --remote --file=./seed/seed.sql

echo "==> 4/4 Build & deploy"
npm run cf:build
npx wrangler deploy

echo
echo "Selesai. Alamat publik tercetak di baris 'https://...workers.dev' di atas."
echo "Simpan email & password admin yang dicetak di langkah 3."
