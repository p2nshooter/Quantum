import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { requireUser } from '@/lib/auth/guards';
import { createSession, destroyAllSessionsForUser } from '@/lib/auth/session';
import { changePasswordSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireUser();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, changePasswordSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, guard.user.id)).limit(1);
  const user = rows[0];
  if (!user) return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Password saat ini salah.' }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

  // Ganti password memutus semua sesi lama (termasuk perangkat lain), lalu
  // perangkat yang sedang dipakai langsung diberi sesi baru agar tidak terlempar
  // ke halaman login di tengah pekerjaan.
  await destroyAllSessionsForUser(user.id);
  await createSession(user.id, req.headers.get('user-agent'));
  await logAction(user.id, 'auth.change_password', 'user', user.id);

  return NextResponse.json({ ok: true });
});
