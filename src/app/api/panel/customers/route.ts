import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers } from '@/lib/db/schema';
import { requireRole, requireUser } from '@/lib/auth/guards';
import { customerSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const GET = withErrorHandling(async () => {
  const guard = await requireUser();
  if ('error' in guard) return guard.error;

  const db = await getDb();
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(500);
  return NextResponse.json({ customers: rows });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, customerSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const id = newId('cust');
  await db.insert(customers).values({ id, ...parsed.data });
  await logAction(guard.user.id, 'customer.create', 'customer', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true, id });
});
