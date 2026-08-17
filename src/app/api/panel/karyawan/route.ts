import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { divisions, employees } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { employeeSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';
import { mapEmployeeInput } from '@/lib/data/employees';

export const dynamic = 'force-dynamic';

/** Pemilik boleh membaca daftar karyawan; hanya admin & keuangan yang mengubah. */
export const GET = withErrorHandling(async () => {
  const guard = await requireRole('keuangan', 'bos', 'produksi');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  const rows = await db
    .select({ employee: employees, divisionName: divisions.name })
    .from(employees)
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .orderBy(asc(employees.name));

  return NextResponse.json({ employees: rows.map((r) => ({ ...r.employee, divisionName: r.divisionName })) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, employeeSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const id = newId('emp');
  await db.insert(employees).values({ id, ...(await mapEmployeeInput(parsed.data)) } as never);
  await logAction(guard.user.id, 'employee.create', 'employee', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true, id });
});
