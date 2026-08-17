import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { capitalEntries } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { capitalSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const guard = await requireRole('keuangan', 'bos');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  const rows = await db.select().from(capitalEntries).orderBy(desc(capitalEntries.entryAt)).limit(200);
  const balance = rows.reduce((sum, r) => (r.type === 'setoran' ? sum + r.amountIdr : sum - r.amountIdr), 0);

  return NextResponse.json({ entries: rows, balance });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, capitalSchema);
  if ('error' in parsed) return parsed.error;
  const { entryAt, ...rest } = parsed.data;

  const db = await getDb();
  const id = newId('cap');
  await db.insert(capitalEntries).values({
    id,
    ...rest,
    entryAt: new Date(parseDateInput(entryAt)!),
    createdBy: guard.user.id
  });
  await logAction(guard.user.id, 'capital.create', 'capital', id, { type: rest.type, amountIdr: rest.amountIdr });

  return NextResponse.json({ ok: true, id });
});
