import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { payments, serviceOrders } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { paymentSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { getServiceOrderDetail } from '@/lib/data/service-orders';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, paymentSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const order = (await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1))[0];
  if (!order) return NextResponse.json({ error: 'Order servis tidak ditemukan.' }, { status: 404 });

  const paidAtMs = parseDateInput(parsed.data.paidAt);
  if (paidAtMs === null) return NextResponse.json({ error: 'Tanggal bayar tidak valid.' }, { status: 400 });

  const paymentId = newId('pay');
  await db.insert(payments).values({
    id: paymentId,
    refType: 'service_order',
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
    serviceOrderId: id,
    orderNumber: order.orderNumber,
    amountIdr: parsed.data.amountIdr
  });

  const detail = await getServiceOrderDetail(id);
  return NextResponse.json({ ok: true, id: paymentId, detail });
});
