import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { payments, workOrders } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { paymentSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { getWorkOrderDetail } from '@/lib/data/work-orders';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, paymentSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const exists = await db.select({ id: workOrders.id }).from(workOrders).where(eq(workOrders.id, id)).limit(1);
  if (exists.length === 0) return NextResponse.json({ error: 'SPK tidak ditemukan.' }, { status: 404 });

  const paidAtMs = parseDateInput(parsed.data.paidAt);
  if (paidAtMs === null) return NextResponse.json({ error: 'Tanggal bayar tidak valid.' }, { status: 400 });

  const paymentId = newId('pay');
  await db.insert(payments).values({
    id: paymentId,
    refType: 'work_order',
    refId: id,
    label: parsed.data.label,
    amountIdr: parsed.data.amountIdr,
    method: parsed.data.method,
    paidAt: new Date(paidAtMs),
    reference: parsed.data.reference,
    notes: parsed.data.notes,
    createdBy: guard.user.id
  });
  await logAction(guard.user.id, 'payment.create', 'payment', paymentId, {
    workOrderId: id,
    amountIdr: parsed.data.amountIdr
  });

  const detail = await getWorkOrderDetail(id);
  return NextResponse.json({ ok: true, id: paymentId, detail });
});
