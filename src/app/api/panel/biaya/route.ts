import { NextRequest, NextResponse } from 'next/server';
import { and, desc, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { expenses } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { expenseSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const toDate = (value: string | null) => {
  const ms = parseDateInput(value);
  return ms === null ? null : new Date(ms);
};

export const GET = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan', 'bos');
  if ('error' in guard) return guard.error;

  const url = new URL(req.url);
  const from = toDate(url.searchParams.get('from'));
  const to = toDate(url.searchParams.get('to'));

  const db = await getDb();
  const where = from && to ? and(gte(expenses.spentAt, from), lte(expenses.spentAt, to)) : undefined;
  const rows = await db.select().from(expenses).where(where).orderBy(desc(expenses.spentAt)).limit(300);
  const total = rows.reduce((sum, r) => sum + r.amountIdr, 0);

  return NextResponse.json({ expenses: rows, total });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, expenseSchema);
  if ('error' in parsed) return parsed.error;
  const { spentAt, paidAt, dueDate, ...rest } = parsed.data;

  const db = await getDb();
  const id = newId('exp');
  await db.insert(expenses).values({
    id,
    ...rest,
    spentAt: toDate(spentAt)!,
    paidAt: toDate(paidAt),
    dueDate: toDate(dueDate),
    createdBy: guard.user.id
  });
  await logAction(guard.user.id, 'expense.create', 'expense', id, {
    category: rest.category,
    amountIdr: rest.amountIdr
  });

  return NextResponse.json({ ok: true, id });
});
