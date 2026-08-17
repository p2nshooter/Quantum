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

echo "==> 1/6 Membuat database D1 'quantum_db' (dilewati kalau sudah ada)"
D1_OUTPUT="$(npx wrangler d1 create quantum_db 2>&1 || true)"
echo "$D1_OUTPUT"

# Ambil database_id, baik dari hasil pembuatan barusan maupun dari daftar yang ada.
DB_ID="$(printf '%s' "$D1_OUTPUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)"
if [ -z "$DB_ID" ]; then
  DB_ID="$(npx wrangler d1 list --json 2>/dev/null | node -e "
    let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const db=(JSON.parse(s)||[]).find(x=>x.name==='quantum_db');
      if(db) process.stdout.write(db.uuid||db.id||'');
    });" || true)"
fi
[ -n "$DB_ID" ] || { echo "Gagal mendapatkan database_id D1."; exit 1; }
echo "    database_id: $DB_ID"

echo "==> 2/6 Membuat KV namespace 'QUANTUM_KV' (dilewati kalau sudah ada)"
KV_OUTPUT="$(npx wrangler kv namespace create QUANTUM_KV 2>&1 || true)"
echo "$KV_OUTPUT"
KV_ID="$(printf '%s' "$KV_OUTPUT" | grep -oE '[0-9a-f]{32}' | head -1 || true)"
if [ -z "$KV_ID" ]; then
  KV_ID="$(npx wrangler kv namespace list 2>/dev/null | node -e "
    let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      const ns=(JSON.parse(s)||[]).find(x=>/QUANTUM_KV/.test(x.title||''));
      if(ns) process.stdout.write(ns.id||'');
    });" || true)"
fi
[ -n "$KV_ID" ] || { echo "Gagal mendapatkan id KV namespace."; exit 1; }
echo "    kv id: $KV_ID"

echo "==> 3/6 Menulis id ke wrangler.jsonc"
node -e "
  const fs=require('fs');
  const p='wrangler.jsonc';
  let s=fs.readFileSync(p,'utf8');
  s=s.replace('REPLACE_WITH_D1_DATABASE_ID', process.argv[1]);
  s=s.replace('REPLACE_WITH_KV_NAMESPACE_ID', process.argv[2]);
  fs.writeFileSync(p,s);
" "$DB_ID" "$KV_ID"

echo "==> 4/6 Migrasi skema ke D1"
npx wrangler d1 migrations apply quantum_db --remote

echo "==> 5/6 Mengisi data awal (katalog + akun admin)"
npm run generate:seed
npx wrangler d1 execute quantum_db --remote --file=./seed/seed.sql

echo "==> 6/6 Build & deploy"
npm run cf:build
npx wrangler deploy

echo
echo "Selesai. Alamat publik tercetak di baris 'https://...workers.dev' di atas."
echo "Simpan email & password admin yang dicetak di langkah 5."
