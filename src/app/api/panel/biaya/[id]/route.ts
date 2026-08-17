import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { expenses, payrolls } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Tandai biaya sebagai sudah dibayar hari ini. */
export const PATCH = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  await db.update(expenses).set({ paidAt: new Date(), updatedAt: new Date() }).where(eq(expenses.id, id));
  await logAction(guard.user.id, 'expense.mark_paid', 'expense', id);

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  // Biaya yang lahir dari slip gaji tidak boleh dihapus lepas dari slipnya —
  // kalau tidak, laporan dan arsip gaji jadi tidak cocok.
  const linked = await db.select({ id: payrolls.id }).from(payrolls).where(eq(payrolls.expenseId, id)).limit(1);
  if (linked.length > 0) {
    return NextResponse.json(
      { error: 'Biaya ini berasal dari slip gaji. Hapus slip gajinya di menu Penggajian agar keduanya ikut terhapus.' },
      { status: 409 }
    );
  }

  await db.delete(expenses).where(eq(expenses.id, id));
  await logAction(guard.user.id, 'expense.delete', 'expense', id);
  return NextResponse.json({ ok: true });
});
