import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { employees, payrolls } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { PayrollClient } from '@/components/panel/PayrollClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PenggajianPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Penggajian menyangkut angka gaji perorangan — hanya keuangan dan admin.
  if (user.role !== 'admin' && user.role !== 'keuangan') redirect('/panel');

  const db = await getDb();
  const [employeeRows, payrollRows] = await Promise.all([
    db.select().from(employees).orderBy(asc(employees.name)),
    db
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
      .limit(200)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Penggajian</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Centang komponen yang dipakai — yang tidak dicentang tidak ikut tercetak di slip. Setiap slip yang
          disimpan otomatis tercatat sebagai biaya gaji sehingga masuk laporan laba rugi dan arus kas.
        </p>
      </div>

      <PayrollClient initialEmployees={employeeRows} initialPayrolls={payrollRows} />
    </div>
  );
}
