import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bodyModels } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { ModelsClient } from '@/components/panel/ModelsClient';

export const dynamic = 'force-dynamic';

export default async function ModelsPage() {
  const db = await getDb();
  const [rows, user] = await Promise.all([
    db.select().from(bodyModels).orderBy(asc(bodyModels.code)),
    getCurrentUser()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Model bodi</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Katalog model beserta harga dasar dan estimasi waktu — dipakai di halaman publik dan saat membuat SPK.
        </p>
      </div>

      <ModelsClient initialModels={rows} canDelete={user?.role === 'admin'} />
    </div>
  );
}
