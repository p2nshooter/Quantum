import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { promos } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { promoSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const toDate = (value: string | null) => {
  const ms = parseDateInput(value);
  return ms === null ? null : new Date(ms);
};

export const GET = withErrorHandling(async () => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  return NextResponse.json({ promos: await db.select().from(promos).orderBy(asc(promos.sortOrder)) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, promoSchema);
  if ('error' in parsed) return parsed.error;
  const { startsAt, endsAt, ...rest } = parsed.data;

  const db = await getDb();
  const id = newId('promo');
  await db.insert(promos).values({ id, ...rest, startsAt: toDate(startsAt), endsAt: toDate(endsAt) });
  await logAction(guard.user.id, 'promo.create', 'promo', id, { title: rest.title });

  return NextResponse.json({ ok: true, id });
});
