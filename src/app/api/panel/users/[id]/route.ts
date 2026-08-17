import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { sessions, users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { userUpdateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, userUpdateSchema);
  if ('error' in parsed) return parsed.error;
  const { name, role, active, password } = parsed.data;

  const db = await getDb();

  // Jangan sampai sistem kehilangan admin terakhirnya: menurunkan peran atau
  // menonaktifkan admin hanya boleh kalau masih ada admin aktif yang lain.
  const removesAdmin = (role !== undefined && role !== 'admin') || active === false;
  if (removesAdmin) {
    const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
    if (target?.role === 'admin' && target.active) {
      const others = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.active, true), ne(users.id, id)));
      if ((others[0]?.count ?? 0) === 0) {
        return NextResponse.json(
          { error: 'Ini satu-satunya admin aktif. Angkat admin lain dulu sebelum mengubah akun ini.' },
          { status: 409 }
        );
      }
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (active !== undefined) updates.active = active;
  if (password !== undefined) updates.passwordHash = await hashPassword(password);

  await db.update(users).set(updates).where(eq(users.id, id));

  // Reset password oleh admin atau penonaktifan akun harus langsung memutus
  // sesi milik user tersebut, bukan menunggu cookie-nya kedaluwarsa.
  if (password !== undefined || active === false) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }

  await logAction(guard.user.id, 'user.update', 'user', id, {
    name,
    role,
    active,
    passwordReset: password !== undefined
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  if (id === guard.user.id) {
    return NextResponse.json({ error: 'Anda tidak bisa menghapus akun sendiri.' }, { status: 400 });
  }

  const db = await getDb();
  const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  if (!target) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });

  if (target.role === 'admin' && target.active) {
    const others = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.active, true), ne(users.id, id)));
    if ((others[0]?.count ?? 0) === 0) {
      return NextResponse.json({ error: 'Ini satu-satunya admin aktif dan tidak bisa dihapus.' }, { status: 409 });
    }
  }

  await db.delete(users).where(eq(users.id, id));
  await logAction(guard.user.id, 'user.delete', 'user', id, { email: target.email });

  return NextResponse.json({ ok: true });
});
