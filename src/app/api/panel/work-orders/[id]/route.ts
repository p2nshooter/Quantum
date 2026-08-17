import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { workOrders } from '@/lib/db/schema';
import { requireAdmin, requireRole } from '@/lib/auth/guards';
import { workOrderUpdateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { getWorkOrderDetail } from '@/lib/data/work-orders';
import { parseDateInput } from '@/lib/format';
import { logAction } from '@/lib/audit';

export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const detail = await getWorkOrderDetail(id);
  if (!detail) return NextResponse.json({ error: 'SPK tidak ditemukan.' }, { status: 404 });
  return NextResponse.json(detail);
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, workOrderUpdateSchema);
  if ('error' in parsed) return parsed.error;
  const { startDate, targetDate, deliveredAt, ...rest } = parsed.data;

  const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  // Field tanggal hanya ikut di-update kalau memang dikirim — `undefined` berarti
  // "jangan diubah", sedangkan `null` berarti "kosongkan".
  if (startDate !== undefined) updates.startDate = toDate(startDate);
  if (targetDate !== undefined) updates.targetDate = toDate(targetDate);
  if (deliveredAt !== undefined) updates.deliveredAt = toDate(deliveredAt);

  const db = await getDb();

  // Menandai SPK selesai/diserahkan secara manual juga harus mengunci tanggal
  // pengakuan pendapatannya — kalau tidak, SPK yang dilompatkan langsung ke
  // "diserahkan" tanpa melewati tahapan tidak akan pernah muncul di laba rugi.
  if (rest.status && (rest.status === 'selesai' || rest.status === 'diserahkan')) {
    const current = (await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1))[0];
    if (current && !current.completedAt) updates.completedAt = new Date();
  }

  await db.update(workOrders).set(updates).where(eq(workOrders.id, id));
  await logAction(guard.user.id, 'work_order.update', 'work_order', id, rest);

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  // Tahapan dan pembayaran ikut terhapus lewat ON DELETE CASCADE.
  const db = await getDb();
  await db.delete(workOrders).where(eq(workOrders.id, id));
  await logAction(guard.user.id, 'work_order.delete', 'work_order', id);

  return NextResponse.json({ ok: true });
});

function toDate(value: string | null): Date | null {
  const ms = parseDateInput(value);
  return ms === null ? null : new Date(ms);
}
