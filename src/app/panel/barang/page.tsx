import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { items } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { ItemsClient } from '@/components/panel/ItemsClient';

export const dynamic = 'force-dynamic';

export default async function ItemsPage() {
  const db = await getDb();
  const [user, rows] = await Promise.all([
    getCurrentUser(),
    db.select().from(items).orderBy(asc(items.kind), asc(items.name))
  ]);

  const canWrite = user?.role === 'admin' || user?.role === 'produksi' || user?.role === 'keuangan';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Barang &amp; jasa</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Master sparepart dan jasa bengkel beserta harga modal, harga jual, dan stok. Harga modal di sini yang dipakai
          menghitung laba tiap order servis.
        </p>
      </div>

      <ItemsClient initialItems={rows} canWrite={canWrite} />
    </div>
  );
}
