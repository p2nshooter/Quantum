import type { Metadata } from 'next';
import { SiteFooter, SiteNav } from '@/components/site/SiteNav';
import { TrackClient } from './TrackClient';

export const metadata: Metadata = {
  title: 'Lacak Progres Unit',
  description: 'Pantau tahapan pengerjaan unit karoseri Anda dengan nomor SPK dan nomor rangka.'
};

export default function TrackPage() {
  return (
    <>
      <SiteNav />
      <main className="container-page py-14">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Lacak progres unit</h1>
        <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">
          Masukkan nomor SPK dan nomor rangka unit Anda untuk melihat sudah sampai tahap mana pengerjaannya.
        </p>
        <div className="mt-8 max-w-3xl">
          <TrackClient />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
