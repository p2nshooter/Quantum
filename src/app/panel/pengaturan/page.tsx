import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings';
import { SettingsClient } from '@/components/panel/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  // Tarif pajak dan identitas kop mengubah angka di semua laporan sekaligus,
  // jadi halamannya memang hanya untuk admin.
  if (user?.role !== 'admin') redirect('/panel');

  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Pengaturan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tarif pajak, identitas kop surat, dan saldo kas awal perusahaan.
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
