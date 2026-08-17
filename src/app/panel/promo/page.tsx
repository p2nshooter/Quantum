import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { promos } from '@/lib/db/schema';
import { PromosClient } from '@/components/panel/PromosClient';

export const dynamic = 'force-dynamic';

export default async function PromoPage() {
  const db = await getDb();
  const rows = await db.select().from(promos).orderBy(asc(promos.sortOrder));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Promo &amp; event</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Konten yang tampil di halaman depan. Apa pun yang diubah di sini langsung terlihat pengunjung.
        </p>
      </div>

      <PromosClient initialPromos={rows} />
    </div>
  );
}
