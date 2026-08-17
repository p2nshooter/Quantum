import { NextResponse } from 'next/server';
import { getCurrentUser, type SessionUser } from './session';
import type { UserRole } from '@/lib/karoseri/constants';

type GuardResult = { user: SessionUser } | { error: NextResponse };

export async function requireUser(): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Belum masuk. Silakan login kembali.' }, { status: 401 }) };
  }
  return { user };
}

/**
 * Batasi endpoint ke peran tertentu. `admin` selalu lolos — pemilik sistem
 * tidak perlu didaftarkan di setiap daftar peran.
 */
export async function requireRole(...roles: UserRole[]): Promise<GuardResult> {
  const result = await requireUser();
  if ('error' in result) return result;

  if (result.user.role !== 'admin' && !roles.includes(result.user.role)) {
    return { error: NextResponse.json({ error: 'Peran Anda tidak berwenang untuk aksi ini.' }, { status: 403 }) };
  }
  return result;
}

export async function requireAdmin(): Promise<GuardResult> {
  return requireRole('admin');
}

/** Siapa saja yang boleh mengubah data produksi (SPK, tahapan, master data). */
export async function requireProduksi(): Promise<GuardResult> {
  return requireRole('produksi');
}

/** Siapa saja yang boleh mencatat pembayaran. */
export async function requireKeuangan(): Promise<GuardResult> {
  return requireRole('keuangan');
}
