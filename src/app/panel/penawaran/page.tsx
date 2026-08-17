import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';
import { LeadsClient } from '@/components/panel/LeadsClient';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const db = await getDb();
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Permintaan penawaran</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Masuk dari form di halaman publik. Tandai statusnya agar tidak ada calon pelanggan yang terlewat.
        </p>
      </div>

      <LeadsClient initialLeads={rows} />
    </div>
  );
}
