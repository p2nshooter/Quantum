import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { divisions, employees } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { EmployeesClient } from '@/components/panel/EmployeesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function KaryawanPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Pemilik boleh memeriksa data karyawan, tapi tidak boleh mengubahnya.
  const allowed = ['admin', 'keuangan', 'bos', 'produksi'];
  if (!allowed.includes(user.role)) redirect('/panel');
  const canEdit = user.role === 'admin' || user.role === 'keuangan';

  const db = await getDb();
  const [employeeRows, divisionRows] = await Promise.all([
    db
      .select({ employee: employees, divisionName: divisions.name })
      .from(employees)
      .leftJoin(divisions, eq(employees.divisionId, divisions.id))
      .orderBy(asc(employees.name)),
    db.select().from(divisions).orderBy(asc(divisions.name))
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Karyawan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Data montir dan staf per bagian, lengkap dengan jenis kepegawaian, upah, dan masa kontrak.
          {!canEdit && ' Anda membuka halaman ini dalam mode baca saja.'}
        </p>
      </div>

      <EmployeesClient
        initialEmployees={employeeRows.map((r) => ({ ...r.employee, divisionName: r.divisionName }))}
        initialDivisions={divisionRows}
        canEdit={canEdit}
      />
    </div>
  );
}
