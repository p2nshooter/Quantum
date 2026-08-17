import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { currentMonthPeriod, getOwnerSummary } from '@/lib/data/reports';
import { StatCard } from '@/components/ui/StatCard';
import { formatIdrShort, formatDate } from '@/lib/format';
import { REPORT_META, REPORT_TYPES } from '@/lib/reports/builders';
import { REPORT_ROLES } from '@/lib/karoseri/constants';

// Laporan tidak boleh pernah disajikan dari cache: angkanya berubah setiap kali
// ada transaksi baru, dan laporan basi lebih berbahaya daripada laporan lambat.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LaporanIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!REPORT_ROLES.includes(user.role)) redirect('/panel');

  const period = currentMonthPeriod();
  const { profitLoss, receivables, payables, cashFlow, inventory } = await getOwnerSummary(period);
  const periodQuery = `from=${period.from.toISOString().slice(0, 10)}&to=${period.to.toISOString().slice(0, 10)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Laporan keuangan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ringkasan bulan berjalan · {formatDate(period.from)} – {formatDate(period.to)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendapatan" value={formatIdrShort(profitLoss.revenue.total)} hint="Pekerjaan selesai bulan ini" />
        <StatCard
          label="Laba bersih"
          value={formatIdrShort(profitLoss.netProfit)}
          tone={profitLoss.netProfit >= 0 ? 'success' : 'warning'}
          hint="Setelah biaya & pajak"
        />
        <StatCard label="Saldo kas" value={formatIdrShort(cashFlow.closingBalance)} hint="Posisi akhir periode" />
        <StatCard
          label="Piutang"
          value={formatIdrShort(receivables.total)}
          tone={receivables.total > 0 ? 'warning' : 'default'}
          hint={`${receivables.rows.length} tagihan belum lunas`}
        />
        <StatCard label="Laba kotor" value={formatIdrShort(profitLoss.grossProfit)} hint="Pendapatan − HPP" />
        <StatCard label="Biaya operasional" value={formatIdrShort(profitLoss.operatingExpenseTotal)} />
        <StatCard
          label="Utang usaha"
          value={formatIdrShort(payables.total)}
          tone={payables.total > 0 ? 'warning' : 'default'}
          hint={`${payables.rows.length} tagihan ke pihak lain`}
        />
        <StatCard
          label="Nilai persediaan"
          value={formatIdrShort(inventory.totalValue)}
          hint={inventory.lowStockCount > 0 ? `${inventory.lowStockCount} barang menipis` : 'Stok aman'}
          tone={inventory.lowStockCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <div>
        <h2 className="mb-3 font-bold text-slate-900 dark:text-white">Buka laporan lengkap</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((type) => (
            <Link key={type} href={`/panel/laporan/${type}?${periodQuery}`} className="card transition hover:border-quantum-400">
              <span className="text-2xl">{REPORT_META[type].icon}</span>
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{REPORT_META[type].menu}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{REPORT_META[type].description}</p>
              <p className="mt-3 text-xs font-semibold text-quantum-600">Lihat, unduh Word / PDF →</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
