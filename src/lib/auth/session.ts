import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sessions, users } from '@/lib/db/schema';
import { newId } from '@/lib/id';
import type { UserRole } from '@/lib/karoseri/constants';

export const SESSION_COOKIE = 'quantum_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export async function createSession(userId: string, userAgent?: string | null): Promise<string> {
  const db = await getDb();
  const id = newId('sess');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ id, userId, expiresAt, userAgent: userAgent ?? null });

  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    expires: expiresAt
  });

  return id;
}

/**
 * Sesi divalidasi ke database setiap request (bukan cuma baca cookie), jadi
 * menonaktifkan akun atau menghapus sesi langsung memutus akses — tidak perlu
 * menunggu cookie kedaluwarsa.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || !row.active) return null;

  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  store.delete(SESSION_COOKIE);
}

/** Dipakai saat password diganti: semua sesi lain milik user ikut diputus. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
