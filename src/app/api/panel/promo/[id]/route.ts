import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { promos } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { promoSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { parseDateInput } from '@/lib/format';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const toDate = (value: string | null) => {
  const ms = parseDateInput(value);
  return ms === null ? null : new Date(ms);
};

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, promoSchema);
  if ('error' in parsed) return parsed.error;
  const { startsAt, endsAt, ...rest } = parsed.data;

  const db = await getDb();
  await db
    .update(promos)
    .set({ ...rest, startsAt: toDate(startsAt), endsAt: toDate(endsAt), updatedAt: new Date() })
    .where(eq(promos.id, id));
  await logAction(guard.user.id, 'promo.update', 'promo', id, { title: rest.title });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  await db.delete(promos).where(eq(promos.id, id));
  await logAction(guard.user.id, 'promo.delete', 'promo', id);
  return NextResponse.json({ ok: true });
});
