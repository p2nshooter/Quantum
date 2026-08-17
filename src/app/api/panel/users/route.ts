import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/guards';
import { hashPassword } from '@/lib/auth/password';
import { userCreateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const GET = withErrorHandling(async () => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const db = await getDb();
  // Hash password tidak pernah ikut keluar dari endpoint ini.
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ users: rows });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, userCreateSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const id = newId('usr');
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await db.insert(users).values({
      id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash
    });
  } catch (err) {
    if (/UNIQUE constraint failed/i.test(err instanceof Error ? err.message : String(err))) {
      return NextResponse.json({ error: 'Email tersebut sudah terdaftar.' }, { status: 409 });
    }
    throw err;
  }

  await logAction(guard.user.id, 'user.create', 'user', id, {
    email: parsed.data.email,
    role: parsed.data.role
  });

  return NextResponse.json({ ok: true, id });
});
