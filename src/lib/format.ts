/** Helper format tampilan (rupiah & tanggal) — aman dipakai di server maupun client. */

/** Nilai tanggal apa pun yang mungkin diterima komponen. */
export type DateLike = Date | number | string | null | undefined;

export function formatIdr(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

/** Versi ringkas untuk kartu statistik: Rp 1,2 M / Rp 850 jt. */
export function formatIdrShort(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1_000_000) return `Rp ${Math.round(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `Rp ${Math.round(value / 1_000)} rb`;
  return formatIdr(value);
}

export function formatDate(value: DateLike): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: DateLike): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** `2026-08-17` → timestamp ms (UTC), atau null kalau kosong/tidak valid. */
export function parseDateInput(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** timestamp → `2026-08-17` untuk `<input type="date">`. */
export function toDateInput(value: DateLike): string {
  const date = toDate(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

/** Sisa hari menuju tanggal target; negatif berarti sudah lewat target. */
export function daysUntil(target: DateLike): number | null {
  const date = toDate(target);
  if (!date) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((date.getTime() - Date.now()) / dayMs);
}

/**
 * Menerima Date, timestamp, maupun string ISO — data yang sama bisa datang
 * sebagai Date (langsung dari Drizzle di server) atau string (hasil `res.json()`
 * di klien), dan komponen yang sama dipakai untuk keduanya.
 */
function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
