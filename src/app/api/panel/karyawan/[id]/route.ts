import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { employees, payrolls } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { employeeSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { mapEmployeeInput } from '@/lib/data/employees';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, employeeSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  await db
    .update(employees)
    .set({ ...(await mapEmployeeInput(parsed.data)), updatedAt: new Date() } as never)
    .where(eq(employees.id, id));
  await logAction(guard.user.id, 'employee.update', 'employee', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  // Karyawan yang pernah digaji tidak dihapus — slip gaji lama harus tetap utuh.
  // Nonaktifkan saja; datanya tetap ada untuk arsip dan laporan.
  const used = await db
    .select({ count: sql<number>`count(*)` })
    .from(payrolls)
    .where(eq(payrolls.employeeId, id));

  if ((used[0]?.count ?? 0) > 0) {
    await db.update(employees).set({ status: 'nonaktif', active: false, updatedAt: new Date() }).where(eq(employees.id, id));
    await logAction(guard.user.id, 'employee.deactivate', 'employee', id);
    return NextResponse.json({
      ok: true,
      deactivated: true,
      message: 'Karyawan sudah punya riwayat slip gaji, jadi dinonaktifkan (bukan dihapus) agar arsip gaji tetap utuh.'
    });
  }

  await db.delete(employees).where(eq(employees.id, id));
  await logAction(guard.user.id, 'employee.delete', 'employee', id);
  return NextResponse.json({ ok: true, deactivated: false });
});
