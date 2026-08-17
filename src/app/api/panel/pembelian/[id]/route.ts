import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { items, purchaseItems, purchases, stockMoves } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { purchasePaymentSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Catat pembayaran (cicilan) atas utang pembelian. */
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, purchasePaymentSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const row = (await db.select().from(purchases).where(eq(purchases.id, id)).limit(1))[0];
  if (!row) return NextResponse.json({ error: 'Pembelian tidak ditemukan.' }, { status: 404 });

  const nextPaid = row.paidIdr + parsed.data.amountIdr;
  if (nextPaid > row.totalIdr) {
    return NextResponse.json(
      { error: `Pembayaran melebihi sisa utang. Sisa saat ini Rp ${(row.totalIdr - row.paidIdr).toLocaleString('id-ID')}.` },
      { status: 400 }
    );
  }

  await db.update(purchases).set({ paidIdr: nextPaid, updatedAt: new Date() }).where(eq(purchases.id, id));
  await logAction(guard.user.id, 'purchase.pay', 'purchase', id, { amountIdr: parsed.data.amountIdr });

  return NextResponse.json({ ok: true, paidIdr: nextPaid });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  // Stok yang sudah masuk dikembalikan dengan pergerakan keluar tersendiri,
  // bukan dengan menghapus riwayatnya — kartu stok harus tetap bisa ditelusuri.
  const lines = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));
  for (const line of lines) {
    if (!line.itemId) continue;
    await db
      .update(items)
      .set({ stockQty: sql`${items.stockQty} - ${line.qty}`, updatedAt: new Date() })
      .where(eq(items.id, line.itemId));
    await db.insert(stockMoves).values({
      id: newId('stk'),
      itemId: line.itemId,
      type: 'keluar',
      qty: line.qty,
      unitCostIdr: line.unitCostIdr,
      refType: 'purchase_batal',
      refId: id,
      notes: 'Pembatalan pembelian',
      movedAt: new Date(),
      createdBy: guard.user.id
    });
  }

  await db.delete(purchases).where(eq(purchases.id, id));
  await logAction(guard.user.id, 'purchase.delete', 'purchase', id);
  return NextResponse.json({ ok: true });
});
