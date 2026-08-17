import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { serviceOrders } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { serviceOrderUpdateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { deleteServiceOrderCascade, getServiceOrderDetail } from '@/lib/data/service-orders';
import { SERVICE_DONE_STATUSES } from '@/lib/karoseri/constants';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan', 'bos');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const detail = await getServiceOrderDetail(id);
  if (!detail) return NextResponse.json({ error: 'Order servis tidak ditemukan.' }, { status: 404 });
  return NextResponse.json({ detail });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, serviceOrderUpdateSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const db = await getDb();
  const current = (await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1))[0];
  if (!current) return NextResponse.json({ error: 'Order servis tidak ditemukan.' }, { status: 404 });

  const patch: Partial<typeof serviceOrders.$inferInsert> = { updatedAt: new Date() };
  if (input.status !== undefined) patch.status = input.status;
  if (input.diagnosis !== undefined) patch.diagnosis = input.diagnosis;
  if (input.mechanicName !== undefined) patch.mechanicName = input.mechanicName;
  if (input.notes !== undefined) patch.notes = input.notes;

  // Pendapatan servis diakui pada `finishedAt`, jadi tanggalnya diisi otomatis
  // saat order pertama kali selesai dan tidak ditimpa lagi kalau status berubah
  // maju ke "diambil" — memindahkan tanggal akan menggeser laporan bulan lalu.
  if (input.status && SERVICE_DONE_STATUSES.includes(input.status)) {
    if (!current.finishedAt) patch.finishedAt = new Date();
    if (input.status === 'diambil' && !current.pickedUpAt) patch.pickedUpAt = new Date();
  }
  // Order yang dibatalkan tidak boleh ikut terhitung sebagai pendapatan.
  if (input.status === 'batal') {
    patch.finishedAt = null;
    patch.pickedUpAt = null;
  }

  await db.update(serviceOrders).set(patch).where(eq(serviceOrders.id, id));
  await logAction(guard.user.id, 'service_order.update', 'service_order', id, {
    orderNumber: current.orderNumber,
    status: patch.status ?? current.status
  });

  const detail = await getServiceOrderDetail(id);
  return NextResponse.json({ ok: true, detail });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  const current = (await db.select().from(serviceOrders).where(eq(serviceOrders.id, id)).limit(1))[0];
  if (!current) return NextResponse.json({ error: 'Order servis tidak ditemukan.' }, { status: 404 });

  await deleteServiceOrderCascade(id, guard.user.id);
  await logAction(guard.user.id, 'service_order.delete', 'service_order', id, {
    orderNumber: current.orderNumber,
    totalIdr: current.totalIdr
  });
  return NextResponse.json({ ok: true });
});
