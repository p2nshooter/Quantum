import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { itemSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const guard = await requireRole('produksi', 'keuangan', 'bos');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  const rows = await db.select().from(items).orderBy(asc(items.kind), asc(items.name));
  return NextResponse.json({ items: rows });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, itemSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const duplicate = await db.select({ id: items.id }).from(items).where(eq(items.code, parsed.data.code)).limit(1);
  if (duplicate.length > 0) {
    return NextResponse.json({ error: `Kode ${parsed.data.code} sudah dipakai barang lain.` }, { status: 409 });
  }

  const id = newId('itm');
  await db.insert(items).values({ id, ...parsed.data });
  await logAction(guard.user.id, 'item.create', 'item', id, { code: parsed.data.code, name: parsed.data.name });

  return NextResponse.json({ ok: true, id });
});
