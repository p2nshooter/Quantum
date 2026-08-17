import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { employees } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { employeeSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  return NextResponse.json({ employees: await db.select().from(employees).orderBy(asc(employees.name)) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, employeeSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const id = newId('emp');
  await db.insert(employees).values({ id, ...parsed.data });
  await logAction(guard.user.id, 'employee.create', 'employee', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true, id });
});
