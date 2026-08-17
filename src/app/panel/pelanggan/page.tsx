import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { CustomersClient } from '@/components/panel/CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const db = await getDb();
  const [rows, user] = await Promise.all([
    db.select().from(customers).orderBy(desc(customers.createdAt)).limit(500),
    getCurrentUser()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Pelanggan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Data PO, perusahaan, dan perorangan yang unitnya dikerjakan di bengkel.
        </p>
      </div>

      <CustomersClient initialCustomers={rows} canDelete={user?.role === 'admin'} />
    </div>
  );
}
