import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { expenses, payrolls } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  const row = (await db.select().from(payrolls).where(eq(payrolls.id, id)).limit(1))[0];
  if (!row) return NextResponse.json({ error: 'Slip gaji tidak ditemukan.' }, { status: 404 });

  // Biaya yang dibuat bersama slip ikut dihapus, supaya laporan tidak menyisakan
  // beban gaji untuk slip yang sudah dibatalkan.
  if (row.expenseId) await db.delete(expenses).where(eq(expenses.id, row.expenseId));
  await db.delete(payrolls).where(eq(payrolls.id, id));
  await logAction(guard.user.id, 'payroll.delete', 'payroll', id, { slipNumber: row.slipNumber, netIdr: row.netIdr });

  return NextResponse.json({ ok: true });
});
