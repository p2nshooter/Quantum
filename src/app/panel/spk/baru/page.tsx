import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bodyModels, customers } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { WorkOrderForm } from '@/components/panel/WorkOrderForm';

export const dynamic = 'force-dynamic';

export default async function NewWorkOrderPage() {
  const user = await getCurrentUser();
  // Keuangan boleh melihat SPK, tapi yang menerbitkan SPK adalah produksi/admin.
  if (user && user.role === 'keuangan') redirect('/panel/spk');

  const db = await getDb();
  const [customerRows, modelRows] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, company: customers.company })
      .from(customers)
      .orderBy(asc(customers.name)),
    db
      .select({
        id: bodyModels.id,
        code: bodyModels.code,
        name: bodyModels.name,
        unitType: bodyModels.unitType,
        basePriceIdr: bodyModels.basePriceIdr,
        estimatedDays: bodyModels.estimatedDays
      })
      .from(bodyModels)
      .where(eq(bodyModels.active, true))
      .orderBy(asc(bodyModels.code))
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/panel/spk" className="text-sm text-slate-500 hover:text-quantum-600">
          ← Kembali ke daftar SPK
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Buat SPK baru</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nomor SPK dibuat otomatis, begitu juga daftar tahapan produksinya sesuai tipe unit.
        </p>
      </div>

      <WorkOrderForm customers={customerRows} models={modelRows} />
    </div>
  );
}
