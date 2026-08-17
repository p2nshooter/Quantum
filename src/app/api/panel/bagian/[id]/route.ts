import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { divisions, employees } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { divisionSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, divisionSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  await db.update(divisions).set({ ...parsed.data, updatedAt: new Date() }).where(eq(divisions.id, id));
  // Nama bagian ikut disegarkan pada karyawan agar tidak ada dua nama berbeda
  // untuk bagian yang sama di layar dan di slip gaji baru.
  await db.update(employees).set({ division: parsed.data.name }).where(eq(employees.divisionId, id));
  await logAction(guard.user.id, 'division.update', 'division', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  const used = await db.select({ count: sql<number>`count(*)` }).from(employees).where(eq(employees.divisionId, id));
  if ((used[0]?.count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Bagian ini masih dipakai karyawan. Pindahkan karyawannya dulu atau nonaktifkan bagian ini.' },
      { status: 409 }
    );
  }

  await db.delete(divisions).where(eq(divisions.id, id));
  await logAction(guard.user.id, 'division.delete', 'division', id);
  return NextResponse.json({ ok: true });
});
