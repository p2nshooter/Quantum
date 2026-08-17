import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers, items } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings';
import { listServiceOrders } from '@/lib/data/service-orders';
import { ServiceOrdersClient } from '@/components/panel/ServiceOrdersClient';

export const dynamic = 'force-dynamic';

export default async function ServiceOrdersPage() {
  const db = await getDb();
  const [user, orders, customerRows, itemRows, settings] = await Promise.all([
    getCurrentUser(),
    listServiceOrders({ limit: 200 }),
    db
      .select({ id: customers.id, name: customers.name, company: customers.company })
      .from(customers)
      .orderBy(asc(customers.name)),
    db
      .select({
        id: items.id,
        code: items.code,
        name: items.name,
        kind: items.kind,
        unit: items.unit,
        sellPriceIdr: items.sellPriceIdr,
        stockQty: items.stockQty
      })
      .from(items)
      .where(and(eq(items.active, true)))
      .orderBy(asc(items.kind), asc(items.name)),
    getSettings()
  ]);

  const canWrite = user?.role === 'admin' || user?.role === 'produksi' || user?.role === 'keuangan';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Order servis</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Servis harian kendaraan: pekerjaan, sparepart terpakai, dan pembayarannya. Sparepart yang dipakai otomatis
          mengurangi stok.
        </p>
      </div>

      <ServiceOrdersClient
        initialOrders={orders}
        customerOptions={customerRows}
        itemOptions={itemRows}
        taxPercent={settings.ppnEnabled ? settings.ppnPercent : 0}
        canWrite={canWrite}
      />
    </div>
  );
}
