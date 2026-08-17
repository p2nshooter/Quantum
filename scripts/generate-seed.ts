/**
 * Menghasilkan `seed/seed.sql` berisi:
 *   1. katalog model bodi bawaan, dan
 *   2. satu akun administrator awal.
 *
 * Password admin di-hash PBKDF2 dengan parameter yang sama persis seperti
 * `src/lib/auth/password.ts` (versi Web Crypto) — kalau parameter di sana
 * berubah, ubah juga di sini. Password plaintext tidak pernah masuk ke file.
 *
 * Sumber password:
 *   - env `ADMIN_BOOTSTRAP_EMAIL` + `ADMIN_BOOTSTRAP_PASSWORD` bila diisi, atau
 *   - password acak yang dicetak sekali ke terminal dan tidak disimpan di mana pun.
 *
 * Seluruh INSERT memakai `OR IGNORE` sehingga menjalankan seed berulang kali
 * (mis. tiap deploy) tidak menimpa data yang sudah diubah lewat panel.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { BODY_MODEL_PRESETS, ITEM_PRESETS } from '../src/lib/karoseri/constants';

// Harus sama dengan src/lib/auth/password.ts — Cloudflare Workers menolak
// PBKDF2 di atas 100.000 iterasi saat verifikasi.
const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;
const SALT_BYTES = 16;

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH_BYTES, 'sha256');
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function sqlString(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function main() {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@quantumkaryabersama.co.id').trim().toLowerCase();
  const providedPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  const password = providedPassword || randomBytes(12).toString('base64url');
  const passwordHash = hashPassword(password);

  // Id tetap agar seed yang dijalankan ulang mengenali baris yang sama dan
  // OR IGNORE benar-benar melewatinya, bukan membuat admin kedua.
  const adminId = 'usr_bootstrap_admin';

  const lines: string[] = [
    '-- Dihasilkan oleh `npm run generate:seed`. Jangan diedit manual.',
    '-- Aman dijalankan berulang: semua INSERT memakai OR IGNORE.',
    ''
  ];

  lines.push('-- Akun administrator awal');
  lines.push(
    `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, active) VALUES (${sqlString(adminId)}, ${sqlString(
      'Administrator'
    )}, ${sqlString(email)}, ${sqlString(passwordHash)}, 'admin', 1);`
  );
  lines.push('');

  lines.push('-- Katalog model bodi bawaan');
  for (const preset of BODY_MODEL_PRESETS) {
    const id = `mdl_seed_${preset.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    lines.push(
      `INSERT OR IGNORE INTO body_models (id, code, name, unit_type, description, base_price_idr, estimated_days, active) VALUES (${sqlString(
        id
      )}, ${sqlString(preset.code)}, ${sqlString(preset.name)}, ${sqlString(preset.unitType)}, ${sqlString(
        preset.description
      )}, ${preset.basePriceIdr}, ${preset.estimatedDays}, 1);`
    );
  }
  lines.push('');

  lines.push('-- Katalog barang & jasa bawaan (dipakai order servis dan daftar harga publik)');
  for (const preset of ITEM_PRESETS) {
    const id = `mdl_item_${preset.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    lines.push(
      `INSERT OR IGNORE INTO items (id, code, name, kind, unit, cost_price_idr, sell_price_idr, stock_qty, min_stock_qty, show_on_landing, active) VALUES (${sqlString(
        id
      )}, ${sqlString(preset.code)}, ${sqlString(preset.name)}, ${sqlString(preset.kind)}, ${sqlString(
        preset.unit
      )}, ${preset.costPriceIdr}, ${preset.sellPriceIdr}, 0, ${preset.kind === 'barang' ? 5 : 0}, ${
        preset.showOnLanding ? 1 : 0
      }, 1);`
    );
  }
  lines.push('');

  const outPath = resolve(process.cwd(), 'seed/seed.sql');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  console.log(
    `✔ seed/seed.sql dibuat (${BODY_MODEL_PRESETS.length} model bodi + ${ITEM_PRESETS.length} barang/jasa + 1 akun admin).`
  );
  console.log(`  Email admin : ${email}`);
  if (providedPassword) {
    console.log('  Password    : diambil dari ADMIN_BOOTSTRAP_PASSWORD (tidak dicetak).');
  } else {
    console.log(`  Password    : ${password}`);
    console.log('  ^ Password acak ini HANYA dicetak sekali. Simpan sekarang, lalu ganti lewat Panel → Akun Saya.');
  }
}

main();
