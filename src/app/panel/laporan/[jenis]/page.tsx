import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { periodFromParams } from '@/lib/data/reports';
import { buildReport, isReportType, REPORT_META } from '@/lib/reports/builders';
import { ReportView } from '@/components/panel/ReportView';
import { serializeReport } from '@/lib/reports/serialize';
import { REPORT_ROLES } from '@/lib/karoseri/constants';

// Sama seperti halaman indeks: laporan selalu dihitung ulang saat dibuka.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LaporanDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!REPORT_ROLES.includes(user.role)) redirect('/panel');

  const { jenis } = await params;
  if (!isReportType(jenis)) notFound();

  const query = await searchParams;
  const period = periodFromParams(query.from, query.to);
  const doc = await buildReport(jenis, period);

  return (
    <div className="space-y-5">
      <div className="no-print">
        <Link href="/panel/laporan" className="text-sm text-slate-500 hover:text-quantum-600">
          ← Kembali ke daftar laporan
        </Link>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{REPORT_META[jenis].menu}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{REPORT_META[jenis].description}</p>
      </div>

      <ReportView
        doc={serializeReport(doc)}
        jenis={jenis}
        from={period.from.toISOString().slice(0, 10)}
        to={period.to.toISOString().slice(0, 10)}
      />
    </div>
  );
}
