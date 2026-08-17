import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseBody(req, loginSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const user = rows[0];

  // Pesan error sengaja sama untuk email tak dikenal maupun password salah,
  // supaya form login tidak bisa dipakai menebak email mana yang terdaftar.
  const invalid = NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
  if (!user) return invalid;

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return invalid;

  if (!user.active) {
    return NextResponse.json({ error: 'Akun ini dinonaktifkan. Hubungi administrator.' }, { status: 403 });
  }

  await createSession(user.id, req.headers.get('user-agent'));
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logAction(user.id, 'auth.login', 'user', user.id);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});
