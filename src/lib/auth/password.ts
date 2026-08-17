/**
 * Hash password dengan PBKDF2-SHA256 lewat Web Crypto — tersedia native di
 * Cloudflare Workers, jadi tanpa dependency eksternal (bcrypt/argon2 butuh
 * native binding yang tidak jalan di Workers).
 *
 * Format tersimpan: `pbkdf2$<iterasi>$<salt-base64>$<hash-base64>`.
 * Iterasi ikut tersimpan supaya hash lama tetap bisa diverifikasi kalau suatu
 * saat jumlah iterasi dinaikkan.
 *
 * PENTING: `scripts/generate-seed.ts` menghasilkan format yang sama memakai
 * node:crypto. Kalau parameter di sini berubah, ubah juga di sana.
 */

// Cloudflare Workers membatasi PBKDF2 pada 100.000 iterasi. Hash yang dibuat
// dengan angka lebih besar TIDAK akan pernah bisa diverifikasi di Worker
// produksi (walaupun lolos saat `wrangler dev` lokal), jadi jangan dinaikkan.
const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }

  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS
  );
  return new Uint8Array(bits);
}

/** Perbandingan waktu-tetap: jangan bocorkan posisi byte pertama yang berbeda. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
