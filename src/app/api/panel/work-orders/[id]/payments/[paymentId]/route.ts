import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { payments } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/api-handler';
import { getWorkOrderDetail } from '@/lib/data/work-orders';
import { logAction } from '@/lib/audit';

export const DELETE = withErrorHandling(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) => {
    const guard = await requireRole('keuangan');
    if ('error' in guard) return guard.error;
    const { id, paymentId } = await params;

    const db = await getDb();
    const rows = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.refType, 'work_order'), eq(payments.refId, id)))
      .limit(1);
    const payment = rows[0];
    if (!payment) return NextResponse.json({ error: 'Pembayaran tidak ditemukan.' }, { status: 404 });

    await db.delete(payments).where(eq(payments.id, paymentId));
    // Nominal ikut dicatat di log: pembatalan pembayaran mengubah angka piutang,
    // jadi harus bisa ditelusuri siapa yang menghapus dan berapa nilainya.
    await logAction(guard.user.id, 'payment.delete', 'payment', paymentId, {
      workOrderId: id,
      amountIdr: payment.amountIdr,
      label: payment.label
    });

    const detail = await getWorkOrderDetail(id);
    return NextResponse.json({ ok: true, detail });
  }
);
