import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkOrderDetail } from '@/lib/data/work-orders';
import { getCurrentUser } from '@/lib/auth/session';
import { WorkOrderDetailClient } from '@/components/panel/WorkOrderDetailClient';
import { PriorityBadge } from '@/components/ui/Badge';
import { daysUntil, formatDate, formatIdr } from '@/lib/format';
import { UNIT_TYPE_LABEL } from '@/lib/karoseri/constants';
import { COMPANY } from '@/lib/company';
import { PrintMenu } from '@/components/panel/PrintMenu';

export const dynamic = 'force-dynamic';

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, user] = await Promise.all([getWorkOrderDetail(id), getCurrentUser()]);
  if (!detail) notFound();

  const { workOrder, customer, model } = detail;
  const remaining = daysUntil(workOrder.targetDate);
  const role = user?.role ?? 'produksi';

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/panel/spk" className="text-sm text-slate-500 hover:text-quantum-600">
          ← Kembali ke daftar SPK
        </Link>

        {/* Cetak dokumen resmi langsung dari data SPK ini — tidak perlu ketik ulang. */}
        <div className="flex flex-wrap gap-2">
          <PrintMenu label="SPK" jenis="spk" id={workOrder.id} />
          <PrintMenu label="Estimasi Biaya" jenis="estimasi" id={workOrder.id} />
          {detail.outstanding > 0 && <PrintMenu label="Surat Hutang" jenis="surat-hutang" id={workOrder.id} />}
        </div>
      </div>

      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Surat Perintah Kerja</p>
            <h1 className="font-mono text-2xl font-black text-slate-900 dark:text-white">{workOrder.spkNumber}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {UNIT_TYPE_LABEL[workOrder.unitType]}
              {model ? ` · ${model.name}` : ''} · dibuat {formatDate(workOrder.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={workOrder.priority} />
            <span className="hidden text-xs text-slate-400 sm:block">{COMPANY.legalName}</span>
          </div>
        </div>

        <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <div>
            <dt className="text-xs text-slate-400">Pelanggan</dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-white">
              {customer.company || customer.name}
            </dd>
            <dd className="text-xs text-slate-500 dark:text-slate-400">
              {customer.company ? `${customer.name} · ` : ''}
              {customer.phone}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Chassis</dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-white">
              {workOrder.chassisBrand} {workOrder.chassisType ?? ''}
            </dd>
            <dd className="font-mono text-xs text-slate-500 dark:text-slate-400">{workOrder.chassisNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Jadwal</dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatDate(workOrder.startDate)} → {formatDate(workOrder.targetDate)}
            </dd>
            {remaining !== null && workOrder.status !== 'diserahkan' && (
              <dd className={`text-xs ${remaining < 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                {remaining < 0 ? `Lewat target ${Math.abs(remaining)} hari` : `${remaining} hari menuju target`}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-400">Nilai kontrak</dt>
            <dd className="text-sm font-semibold text-slate-900 dark:text-white">
              {formatIdr(workOrder.contractValueIdr)}
            </dd>
            <dd className="text-xs text-slate-500 dark:text-slate-400">
              Sisa {formatIdr(detail.outstanding)}
            </dd>
          </div>
        </dl>

        {(workOrder.policeNumber || workOrder.color || workOrder.seatCount || workOrder.engineNumber) && (
          <dl className="mt-5 grid gap-5 border-t border-slate-100 pt-5 text-sm sm:grid-cols-4 dark:border-slate-800">
            {workOrder.policeNumber && (
              <div>
                <dt className="text-xs text-slate-400">Nomor polisi</dt>
                <dd className="font-semibold uppercase">{workOrder.policeNumber}</dd>
              </div>
            )}
            {workOrder.engineNumber && (
              <div>
                <dt className="text-xs text-slate-400">Nomor mesin</dt>
                <dd className="font-mono text-xs">{workOrder.engineNumber}</dd>
              </div>
            )}
            {workOrder.color && (
              <div>
                <dt className="text-xs text-slate-400">Warna</dt>
                <dd className="font-semibold">{workOrder.color}</dd>
              </div>
            )}
            {workOrder.seatCount !== null && (
              <div>
                <dt className="text-xs text-slate-400">Jumlah kursi</dt>
                <dd className="font-semibold">{workOrder.seatCount}</dd>
              </div>
            )}
          </dl>
        )}

        {workOrder.specNotes && (
          <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="text-xs text-slate-400">Spesifikasi &amp; catatan</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{workOrder.specNotes}</p>
          </div>
        )}
      </header>

      <WorkOrderDetailClient
        initialDetail={{
          workOrder: {
            id: workOrder.id,
            spkNumber: workOrder.spkNumber,
            status: workOrder.status,
            contractValueIdr: workOrder.contractValueIdr,
            deliveredAt: workOrder.deliveredAt
          },
          stages: detail.stages,
          payments: detail.payments,
          progressPercent: detail.progressPercent,
          paidTotal: detail.paidTotal,
          outstanding: detail.outstanding
        }}
        permissions={{
          canEditProduction: role === 'admin' || role === 'produksi',
          canEditFinance: role === 'admin' || role === 'keuangan'
        }}
      />
    </div>
  );
}
