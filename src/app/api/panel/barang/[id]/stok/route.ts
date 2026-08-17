import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { items, stockMoves } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { stockAdjustSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Kartu stok satu barang. */
export const GET = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan', 'bos');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  const moves = await db
    .select()
    .from(stockMoves)
    .where(eq(stockMoves.itemId, id))
    .orderBy(desc(stockMoves.movedAt))
    .limit(100);
  return NextResponse.json({ moves });
});

/** Penyesuaian stok manual (barang masuk/keluar/opname). */
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, stockAdjustSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const db = await getDb();
  const item = (await db.select().from(items).where(eq(items.id, id)).limit(1))[0];
  if (!item) return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 });
  if (item.kind !== 'barang') {
    return NextResponse.json({ error: 'Jasa tidak punya stok, jadi tidak bisa disesuaikan.' }, { status: 400 });
  }

  // "penyesuaian" berarti stok fisik hasil opname, bukan selisih: nilai yang
  // diketik operator langsung jadi stok akhir agar tidak salah tafsir.
  const nextQty = input.type === 'masuk' ? item.stockQty + input.qty
    : input.type === 'keluar' ? item.stockQty - input.qty
    : input.qty;

  if (nextQty < 0) {
    return NextResponse.json(
      { error: `Stok tidak cukup. Sisa ${item.stockQty} ${item.unit}.` },
      { status: 400 }
    );
  }

  const movedAtMs = parseDateInput(input.movedAt);
  if (movedAtMs === null) return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 400 });

  await db.update(items).set({ stockQty: nextQty, updatedAt: new Date() }).where(eq(items.id, id));
  await db.insert(stockMoves).values({
    id: newId('stk'),
    itemId: id,
    type: input.type,
    qty: input.type === 'penyesuaian' ? Math.abs(nextQty - item.stockQty) : input.qty,
    unitCostIdr: input.unitCostIdr || item.costPriceIdr,
    refType: 'adjustment',
    refId: null,
    notes: input.notes,
    movedAt: new Date(movedAtMs),
    createdBy: guard.user.id
  });
  await logAction(guard.user.id, 'stock.adjust', 'item', id, {
    code: item.code,
    type: input.type,
    from: item.stockQty,
    to: nextQty
  });

  return NextResponse.json({ ok: true, stockQty: nextQty });
});
