import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getDashboardStats, getStageWorkload } from '@/lib/data/dashboard';
import { listWorkOrders } from '@/lib/data/work-orders';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { formatDate, formatIdrShort, daysUntil } from '@/lib/format';
import { ACTIVE_STATUSES, UNIT_TYPE_LABEL } from '@/lib/karoseri/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PanelDashboardPage() {
  // Pemilik tidak punya urusan dengan dashboard produksi; halaman depannya adalah laporan.
  const user = await getCurrentUser();
  if (user?.role === 'bos') redirect('/panel/laporan');

  const [stats, workload, activeOrders] = await Promise.all([
    getDashboardStats(),
    getStageWorkload(),
    listWorkOrders({ status: ACTIVE_STATUSES, limit: 12 })
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Dashboard produksi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ringkasan beban bengkel, keterlambatan, dan posisi keuangan proyek berjalan.
          </p>
        </div>
        <Link href="/panel/spk/baru" className="btn-primary">
          + Buat SPK
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unit aktif" value={stats.activeUnits} hint="Antrian, produksi, dan QC" />
        <StatCard label="Sedang dikerjakan" value={stats.inProduction} hint="Status produksi" />
        <StatCard
          label="Lewat target"
          value={stats.lateUnits}
          hint="Target selesai sudah terlewat"
          tone={stats.lateUnits > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Selesai bulan ini" value={stats.finishedThisMonth} tone="success" />
        <StatCard label="Nilai kontrak berjalan" value={formatIdrShort(stats.contractActive)} />
        <StatCard label="Pembayaran masuk bulan ini" value={formatIdrShort(stats.paidThisMonth)} tone="success" />
        <StatCard
          label="Piutang"
          value={formatIdrShort(stats.receivable)}
          hint="Nilai kontrak dikurangi pembayaran"
          tone={stats.receivable > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Penawaran baru" value={stats.newLeads} hint={`${stats.customerCount} pelanggan terdaftar`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-x-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white">Unit dalam pengerjaan</h2>
            <Link href="/panel/spk" className="text-sm font-semibold text-quantum-600 hover:underline">
              Lihat semua
            </Link>
          </div>

          <table className="table-base">
            <thead>
              <tr>
                <th>SPK / Unit</th>
                <th>Pelanggan</th>
                <th className="w-40">Progres</th>
                <th>Target</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => {
                const remaining = daysUntil(order.targetDate);
                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/panel/spk/${order.id}`} className="font-semibold text-quantum-600 hover:underline">
                        {order.spkNumber}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {UNIT_TYPE_LABEL[order.unitType]} · {order.chassisBrand}
                      </div>
                    </td>
                    <td>
                      <div className="text-slate-700 dark:text-slate-200">
                        {order.customerCompany || order.customerName}
                      </div>
                    </td>
                    <td>
                      <ProgressBar percent={order.progressPercent} />
                    </td>
                    <td>
                      <div>{formatDate(order.targetDate)}</div>
                      {remaining !== null && (
                        <div className={`text-xs ${remaining < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {remaining < 0 ? `Telat ${Math.abs(remaining)} hari` : `${remaining} hari lagi`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={order.status} />
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {activeOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada unit dalam pengerjaan.{' '}
                    <Link href="/panel/spk/baru" className="font-semibold text-quantum-600 hover:underline">
                      Buat SPK pertama
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Tahapan yang sedang berjalan</h2>
          {workload.length === 0 ? (
            <p className="text-sm text-slate-400">
              Belum ada tahapan berstatus &ldquo;dikerjakan&rdquo;. Tandai tahapan di detail SPK agar beban tiap pos
              terlihat di sini.
            </p>
          ) : (
            <ul className="space-y-3">
              {workload.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{row.name}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {row.count} unit
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
