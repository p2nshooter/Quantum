import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { items, serviceOrderItems } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { itemSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, itemSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const current = (await db.select().from(items).where(eq(items.id, id)).limit(1))[0];
  if (!current) return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 });

  const duplicate = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.code, parsed.data.code), ne(items.id, id)))
    .limit(1);
  if (duplicate.length > 0) {
    return NextResponse.json({ error: `Kode ${parsed.data.code} sudah dipakai barang lain.` }, { status: 409 });
  }

  await db.update(items).set({ ...parsed.data, updatedAt: new Date() }).where(eq(items.id, id));
  await logAction(guard.user.id, 'item.update', 'item', id, { code: parsed.data.code });
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  const current = (await db.select().from(items).where(eq(items.id, id)).limit(1))[0];
  if (!current) return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 });

  // Barang yang pernah dipakai di order servis tidak dihapus, hanya dinonaktifkan:
  // menghapusnya akan memutus harga modal yang jadi dasar HPP laporan lama.
  const used = await db
    .select({ id: serviceOrderItems.id })
    .from(serviceOrderItems)
    .where(eq(serviceOrderItems.itemId, id))
    .limit(1);

  if (used.length > 0) {
    await db.update(items).set({ active: false, updatedAt: new Date() }).where(eq(items.id, id));
    await logAction(guard.user.id, 'item.deactivate', 'item', id, { code: current.code });
    return NextResponse.json({
      ok: true,
      deactivated: true,
      message: `${current.name} sudah dipakai di order servis, jadi hanya dinonaktifkan.`
    });
  }

  await db.delete(items).where(eq(items.id, id));
  await logAction(guard.user.id, 'item.delete', 'item', id, { code: current.code });
  return NextResponse.json({ ok: true });
});
