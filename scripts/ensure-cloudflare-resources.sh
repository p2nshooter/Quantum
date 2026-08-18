#!/usr/bin/env bash
#
# Memastikan database D1 dan namespace KV yang dipakai wrangler.jsonc benar-benar
# ada, lalu menuliskan id-nya ke wrangler.jsonc.
#
# Dipakai dua tempat:
#   - scripts/setup-cloudflare.sh  → bootstrap dari laptop (setelah `wrangler login`)
#   - .github/workflows/deploy.yml → bootstrap di CI (pakai CLOUDFLARE_API_TOKEN)
#
# Aman dijalankan berulang: kalau resource sudah ada, id-nya cuma dibaca ulang.
# Kalau wrangler.jsonc sudah berisi id sungguhan, berkasnya tidak disentuh.
set -euo pipefail

cd "$(dirname "$0")/.."

CONFIG="wrangler.jsonc"
D1_NAME="quantum_db"
KV_BINDING="QUANTUM_KV"

# Tanpa kredensial, wrangler gagal dengan pesan panjang lalu perintah berikutnya
# menerima keluaran kosong — dulu itu muncul sebagai "Unexpected end of JSON
# input" yang tidak memberi petunjuk apa pun. Dicek di depan supaya jelas.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && ! npx wrangler whoami >/dev/null 2>&1; then
  cat >&2 <<'MSG'
Belum ada kredensial Cloudflare.

  - Di GitHub Actions : isi secret CLOUDFLARE_API_TOKEN dan CLOUDFLARE_ACCOUNT_ID.
  - Di komputer sendiri: jalankan `npx wrangler login` lebih dulu.

Akun sementara `wrangler --temporary` TIDAK bisa dipakai untuk proyek ini:
tokennya terbit tanpa scope apa pun, sehingga pembuatan D1 maupun KV ditolak
dengan "Authentication error [code: 10000]". Sudah dicoba dan gagal.
MSG
  exit 1
fi

# Menulis nilai ke wrangler.jsonc lewat penggantian penanda, bukan lewat parser
# JSON: berkasnya JSONC (berkomentar) dan komentarnya sengaja dipertahankan.
replace_placeholder() {
  local placeholder="$1" value="$2"
  node -e "
    const fs = require('fs');
    const file = '$CONFIG';
    const text = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, text.replace('$placeholder', '$value'));
  "
}

uuid_from() {
  grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' <<<"$1" | head -1 || true
}

if grep -q 'REPLACE_WITH_D1_DATABASE_ID' "$CONFIG"; then
  echo "==> Menyiapkan database D1 '$D1_NAME'"
  # Database baru: id-nya sudah tercetak di keluaran `d1 create`, jadi dipungut
  # dari situ dan `d1 list` tidak perlu dipanggil sama sekali.
  D1_OUTPUT="$(npx wrangler d1 create "$D1_NAME" 2>&1 || true)"
  echo "$D1_OUTPUT"
  DB_ID="$(uuid_from "$D1_OUTPUT")"

  # Database yang sudah ada: `d1 create` menolak, jadi id-nya dicari di daftar.
  if [ -z "$DB_ID" ]; then
    DB_ID="$(npx wrangler d1 list --json 2>/dev/null | node -e "
      let s='';
      process.stdin.on('data', (d) => (s += d)).on('end', () => {
        // Wrangler kadang menyisipkan spanduk sebelum JSON-nya, jadi teks
        // sebelum kurung siku pertama dibuang dulu.
        const start = s.indexOf('[');
        const list = start === -1 ? [] : JSON.parse(s.slice(start).trim() || '[]');
        const db = list.find((x) => x.name === '$D1_NAME');
        process.stdout.write(db ? db.uuid : '');
      });
    ")"
  fi

  if [ -z "$DB_ID" ]; then
    echo "Gagal mendapatkan database_id untuk '$D1_NAME'." >&2
    exit 1
  fi
  replace_placeholder 'REPLACE_WITH_D1_DATABASE_ID' "$DB_ID"
  echo "    database_id = $DB_ID"
else
  echo "==> database_id D1 sudah terisi, dilewati"
fi

if grep -q 'REPLACE_WITH_KV_NAMESPACE_ID' "$CONFIG"; then
  echo "==> Menyiapkan namespace KV '$KV_BINDING'"
  KV_OUTPUT="$(npx wrangler kv namespace create "$KV_BINDING" 2>&1 || true)"
  echo "$KV_OUTPUT"
  KV_ID="$(uuid_from "$KV_OUTPUT")"
  # Wrangler mencetak id KV tanpa tanda hubung, sementara `kv namespace list`
  # memakai bentuk yang sama — jadi keduanya dicoba sebelum menyerah.
  if [ -z "$KV_ID" ]; then
    KV_ID="$(grep -oE '[0-9a-f]{32}' <<<"$KV_OUTPUT" | head -1 || true)"
  fi
  if [ -z "$KV_ID" ]; then
    KV_ID="$(npx wrangler kv namespace list 2>/dev/null | node -e "
      let s='';
      process.stdin.on('data', (d) => (s += d)).on('end', () => {
        const start = s.indexOf('[');
        const list = start === -1 ? [] : JSON.parse(s.slice(start).trim() || '[]');
        const ns = list.find((x) => (x.title || '').endsWith('$KV_BINDING'));
        process.stdout.write(ns ? ns.id : '');
      });
    ")"
  fi
  if [ -z "$KV_ID" ]; then
    echo "Gagal mendapatkan id namespace KV '$KV_BINDING'." >&2
    exit 1
  fi
  replace_placeholder 'REPLACE_WITH_KV_NAMESPACE_ID' "$KV_ID"
  echo "    kv id = $KV_ID"
else
  echo "==> id KV sudah terisi, dilewati"
fi
