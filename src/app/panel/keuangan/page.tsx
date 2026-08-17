import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { capitalEntries, expenses, items, purchases, suppliers } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { FinanceClient } from '@/components/panel/FinanceClient';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const db = await getDb();
  const [user, expenseRows, capitalRows, purchaseRows, itemRows, supplierRows] = await Promise.all([
    getCurrentUser(),
    db.select().from(expenses).orderBy(desc(expenses.spentAt)).limit(300),
    db.select().from(capitalEntries).orderBy(desc(capitalEntries.entryAt)).limit(200),
    db.select().from(purchases).orderBy(desc(purchases.purchasedAt)).limit(200),
    db
      .select({
        id: items.id,
        code: items.code,
        name: items.name,
        unit: items.unit,
        costPriceIdr: items.costPriceIdr
      })
      .from(items)
      .where(eq(items.kind, 'barang'))
      .orderBy(asc(items.name)),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).orderBy(asc(suppliers.name))
  ]);

  // Bagian produksi tidak berkepentingan dengan angka kas, jadi halamannya
  // ditutup sekalian — bukan cuma menunya yang disembunyikan.
  if (!user || user.role === 'produksi') redirect('/panel');

  // Pemilik boleh membaca semua angka keuangan tapi tidak boleh mengubahnya —
  // pencatatan tetap tanggung jawab admin/keuangan.
  const canWrite = user.role === 'admin' || user.role === 'keuangan';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Kas &amp; pembelian</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Biaya operasional, setoran modal, dan pembelian barang. Semua yang dicatat di sini langsung masuk laporan laba
          rugi, arus kas, dan utang usaha.
        </p>
      </div>

      <FinanceClient
        initialExpenses={expenseRows}
        initialCapital={capitalRows}
        initialPurchases={purchaseRows}
        itemOptions={itemRows}
        supplierOptions={supplierRows}
        canWrite={canWrite}
      />
    </div>
  );
}
