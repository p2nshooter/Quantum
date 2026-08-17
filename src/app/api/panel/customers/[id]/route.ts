import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers, workOrders } from '@/lib/db/schema';
import { requireAdmin, requireRole } from '@/lib/auth/guards';
import { customerSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, customerSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  await db
    .update(customers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(customers.id, id));
  await logAction(guard.user.id, 'customer.update', 'customer', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  // Pelanggan yang masih punya SPK tidak dihapus — riwayat produksi harus utuh.
  const used = await db.select({ id: workOrders.id }).from(workOrders).where(eq(workOrders.customerId, id)).limit(1);
  if (used.length > 0) {
    return NextResponse.json(
      { error: 'Pelanggan ini masih memiliki SPK. Hapus atau pindahkan SPK-nya terlebih dahulu.' },
      { status: 409 }
    );
  }

  await db.delete(customers).where(eq(customers.id, id));
  await logAction(guard.user.id, 'customer.delete', 'customer', id);

  return NextResponse.json({ ok: true });
});
