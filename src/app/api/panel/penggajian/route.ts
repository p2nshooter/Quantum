import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, like } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { employees, expenses, payrolls } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { payrollSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { parseDateInput } from '@/lib/format';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  const rows = await db
    .select({
      id: payrolls.id,
      slipNumber: payrolls.slipNumber,
      periodFrom: payrolls.periodFrom,
      periodTo: payrolls.periodTo,
      paidAt: payrolls.paidAt,
      grossIdr: payrolls.grossIdr,
      deductionIdr: payrolls.deductionIdr,
      netIdr: payrolls.netIdr,
      employeeName: employees.name,
      employeePosition: employees.position
    })
    .from(payrolls)
    .innerJoin(employees, eq(payrolls.employeeId, employees.id))
    .orderBy(desc(payrolls.paidAt))
    .limit(200);

  return NextResponse.json({ payrolls: rows });
});

/** Nomor slip gaji `GJ/YYYYMM/NNN`, urut per bulan pembayaran. */
async function generateSlipNumber(paidAt: Date, offset = 0): Promise<string> {
  const db = await getDb();
  const period = `${paidAt.getUTCFullYear()}${String(paidAt.getUTCMonth() + 1).padStart(2, '0')}`;
  const prefix = `GJ/${period}/`;
  const rows = await db
    .select({ slipNumber: payrolls.slipNumber })
    .from(payrolls)
    .where(like(payrolls.slipNumber, `${prefix}%`))
    .orderBy(desc(payrolls.slipNumber))
    .limit(1);

  const last = rows[0] ? Number(rows[0].slipNumber.slice(prefix.length)) : 0;
  return `${prefix}${String((Number.isFinite(last) ? last : 0) + 1 + offset).padStart(3, '0')}`;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, payrollSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const db = await getDb();
  const employee = (await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1))[0];
  if (!employee) return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 });

  const grossIdr = input.components
    .filter((c) => c.type === 'penghasilan')
    .reduce((sum, c) => sum + c.amountIdr, 0);
  const deductionIdr = input.components
    .filter((c) => c.type === 'potongan')
    .reduce((sum, c) => sum + c.amountIdr, 0);
  const netIdr = grossIdr - deductionIdr;

  if (netIdr < 0) {
    return NextResponse.json(
      { error: 'Total potongan melebihi total penghasilan. Periksa kembali nominalnya.' },
      { status: 400 }
    );
  }

  const paidAt = new Date(parseDateInput(input.paidAt)!);
  const id = newId('gaji');

  // Gaji yang dibayarkan langsung tercatat sebagai biaya agar ikut terhitung di
  // laporan laba rugi dan arus kas — tanpa ini penggajian tidak akan pernah
  // muncul di laporan mana pun.
  const expenseId = newId('exp');
  await db.insert(expenses).values({
    id: expenseId,
    category: 'gaji_upah',
    description: `Gaji ${employee.name}${employee.position ? ` (${employee.position})` : ''}`,
    amountIdr: netIdr,
    spentAt: paidAt,
    paidAt,
    method: input.method,
    createdBy: guard.user.id
  });

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slipNumber = await generateSlipNumber(paidAt, attempt);
    try {
      await db.insert(payrolls).values({
        id,
        slipNumber,
        employeeId: input.employeeId,
        periodFrom: new Date(parseDateInput(input.periodFrom)!),
        periodTo: new Date(parseDateInput(input.periodTo)!),
        paidAt,
        method: input.method,
        componentsJson: JSON.stringify(input.components),
        grossIdr,
        deductionIdr,
        netIdr,
        notes: input.notes,
        expenseId,
        createdBy: guard.user.id
      });
      await logAction(guard.user.id, 'payroll.create', 'payroll', id, { slipNumber, netIdr });
      return NextResponse.json({ ok: true, id, slipNumber, netIdr });
    } catch (err) {
      lastError = err;
      if (!/UNIQUE constraint failed/i.test(err instanceof Error ? err.message : String(err))) throw err;
    }
  }

  // Nomor slip gagal dibuat: biaya yang terlanjur dicatat harus ikut dibatalkan,
  // kalau tidak laporan akan memuat gaji yang slipnya tidak pernah ada.
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  throw new Error(
    `Gagal membuat nomor slip gaji: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
});
