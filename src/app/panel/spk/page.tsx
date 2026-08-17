import Link from 'next/link';
import { listWorkOrders } from '@/lib/data/work-orders';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { daysUntil, formatDate, formatIdrShort } from '@/lib/format';
import {
  UNIT_TYPE_LABEL,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABEL,
  type WorkOrderStatus
} from '@/lib/karoseri/constants';

export const dynamic = 'force-dynamic';

export default async function WorkOrderListPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = isStatus(params.status) ? params.status : undefined;
  const search = params.q?.trim() || undefined;

  const orders = await listWorkOrders({ status: status ? [status] : undefined, search });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">SPK &amp; Unit</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {orders.length} SPK ditampilkan{status ? ` · filter status: ${WORK_ORDER_STATUS_LABEL[status]}` : ''}
          </p>
        </div>
        <Link href="/panel/spk/baru" className="btn-primary">
          + Buat SPK
        </Link>
      </div>

      <div className="card space-y-4">
        <form className="flex flex-wrap gap-2" method="get">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder="Cari nomor SPK, nomor rangka, atau pelanggan…"
            className="input flex-1 sm:max-w-sm"
          />
          {status && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn-secondary">
            Cari
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip href={buildHref(undefined, search)} active={!status} label="Semua" />
          {WORK_ORDER_STATUSES.map((value) => (
            <FilterChip
              key={value}
              href={buildHref(value, search)}
              active={status === value}
              label={WORK_ORDER_STATUS_LABEL[value]}
            />
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>SPK</th>
              <th>Unit</th>
              <th>Pelanggan</th>
              <th className="w-40">Progres</th>
              <th>Nilai kontrak</th>
              <th>Target</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const remaining = daysUntil(order.targetDate);
              const late = remaining !== null && remaining < 0 && order.status !== 'selesai' && order.status !== 'diserahkan';
              return (
                <tr key={order.id}>
                  <td>
                    <Link href={`/panel/spk/${order.id}`} className="font-semibold text-quantum-600 hover:underline">
                      {order.spkNumber}
                    </Link>
                    <div className="text-xs text-slate-400">{formatDate(order.createdAt)}</div>
                  </td>
                  <td>
                    <div className="text-slate-700 dark:text-slate-200">{UNIT_TYPE_LABEL[order.unitType]}</div>
                    <div className="text-xs text-slate-400">
                      {order.chassisBrand} · {order.chassisNumber}
                    </div>
                  </td>
                  <td>
                    <div className="text-slate-700 dark:text-slate-200">{order.customerCompany || order.customerName}</div>
                    {order.modelName && <div className="text-xs text-slate-400">{order.modelName}</div>}
                  </td>
                  <td>
                    <ProgressBar percent={order.progressPercent} />
                  </td>
                  <td className="tabular-nums">{formatIdrShort(order.contractValueIdr)}</td>
                  <td>
                    <div>{formatDate(order.targetDate)}</div>
                    {late && <div className="text-xs text-red-500">Telat {Math.abs(remaining!)} hari</div>}
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
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada SPK yang cocok dengan filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-quantum-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </Link>
  );
}

function buildHref(status: WorkOrderStatus | undefined, search: string | undefined): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('q', search);
  const query = params.toString();
  return query ? `/panel/spk?${query}` : '/panel/spk';
}

function isStatus(value: string | undefined): value is WorkOrderStatus {
  return !!value && (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}
