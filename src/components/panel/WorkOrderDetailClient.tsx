'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StageBadge, StatusBadge } from '@/components/ui/Badge';
import { formatDate, formatIdr, toDateInput, type DateLike } from '@/lib/format';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  STAGE_STATUSES,
  STAGE_STATUS_LABEL,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABEL,
  type PaymentMethod,
  type StageStatus,
  type WorkOrderStatus
} from '@/lib/karoseri/constants';

type Stage = {
  id: string;
  sortOrder: number;
  name: string;
  weightPercent: number;
  status: StageStatus;
  picName: string | null;
  startedAt: DateLike;
  finishedAt: DateLike;
  notes: string | null;
};

type Payment = {
  id: string;
  label: string;
  amountIdr: number;
  method: PaymentMethod;
  paidAt: DateLike;
  reference: string | null;
  notes: string | null;
};

export type WorkOrderDetail = {
  workOrder: {
    id: string;
    spkNumber: string;
    status: WorkOrderStatus;
    contractValueIdr: number;
    deliveredAt: DateLike;
  };
  stages: Stage[];
  payments: Payment[];
  progressPercent: number;
  paidTotal: number;
  outstanding: number;
};

type Permissions = { canEditProduction: boolean; canEditFinance: boolean };

export function WorkOrderDetailClient({
  initialDetail,
  permissions
}: {
  initialDetail: WorkOrderDetail;
  permissions: Permissions;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [error, setError] = useState<string | null>(null);
  const [busyStageId, setBusyStageId] = useState<string | null>(null);
  const workOrderId = detail.workOrder.id;

  async function patchStage(stageId: string, payload: Record<string, unknown>) {
    setError(null);
    setBusyStageId(stageId);
    try {
      const res = await fetch(`/api/panel/work-orders/${workOrderId}/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { detail?: WorkOrderDetail; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui tahapan.');
      if (data.detail) setDetail(data.detail);
      // Status SPK bisa ikut bergeser otomatis — segarkan header halaman.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui tahapan.');
    } finally {
      setBusyStageId(null);
    }
  }

  async function updateWorkOrderStatus(status: WorkOrderStatus) {
    setError(null);
    try {
      const body: Record<string, unknown> = { status };
      // Menandai unit sudah diserahkan sekaligus mencatat tanggalnya.
      if (status === 'diserahkan') body.deliveredAt = new Date().toISOString().slice(0, 10);

      const res = await fetch(`/api/panel/work-orders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status SPK.');
      setDetail((prev) => ({ ...prev, workOrder: { ...prev.workOrder, status } }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status SPK.');
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 dark:text-white">Progres pengerjaan</h2>
          <div className="flex items-center gap-2">
            <StatusBadge status={detail.workOrder.status} />
            {permissions.canEditProduction && (
              <select
                className="input input-inline h-9 py-1 text-xs"
                value={detail.workOrder.status}
                onChange={(e) => updateWorkOrderStatus(e.target.value as WorkOrderStatus)}
                aria-label="Ubah status SPK"
              >
                {WORK_ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {WORK_ORDER_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar percent={detail.progressPercent} />
        </div>
      </section>

      <section className="card">
        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Tahapan produksi</h2>
        <ul className="space-y-3">
          {detail.stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              busy={busyStageId === stage.id}
              editable={permissions.canEditProduction}
              onPatch={(payload) => patchStage(stage.id, payload)}
            />
          ))}
        </ul>
      </section>

      <PaymentSection
        workOrderId={workOrderId}
        detail={detail}
        editable={permissions.canEditFinance}
        onDetail={(next) => {
          setDetail(next);
          router.refresh();
        }}
        onError={setError}
      />
    </div>
  );
}

function StageRow({
  stage,
  busy,
  editable,
  onPatch
}: {
  stage: Stage;
  busy: boolean;
  editable: boolean;
  onPatch: (payload: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picName, setPicName] = useState(stage.picName ?? '');
  const [notes, setNotes] = useState(stage.notes ?? '');
  const [startedAt, setStartedAt] = useState(toDateInput(stage.startedAt));
  const [finishedAt, setFinishedAt] = useState(toDateInput(stage.finishedAt));

  return (
    <li className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {stage.sortOrder}
        </span>

        <div className="min-w-[12rem] flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{stage.name}</p>
          <p className="text-xs text-slate-400">
            Bobot {stage.weightPercent}%
            {stage.picName ? ` · PIC ${stage.picName}` : ''}
            {stage.startedAt ? ` · Mulai ${formatDate(stage.startedAt)}` : ''}
            {stage.finishedAt ? ` · Selesai ${formatDate(stage.finishedAt)}` : ''}
          </p>
        </div>

        {editable ? (
          <select
            className="input input-inline h-9 py-1 text-xs"
            disabled={busy}
            value={stage.status}
            onChange={(e) => onPatch({ status: e.target.value as StageStatus })}
            aria-label={`Status tahapan ${stage.name}`}
          >
            {STAGE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STAGE_STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        ) : (
          <StageBadge status={stage.status} />
        )}

        {editable && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-quantum-600 hover:underline">
            {open ? 'Tutup' : 'Detail'}
          </button>
        )}
      </div>

      {stage.notes && !open && <p className="mt-2 pl-10 text-xs text-slate-500 dark:text-slate-400">{stage.notes}</p>}

      {open && editable && (
        <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
          <div>
            <label className="label text-xs">PIC / regu kerja</label>
            <input className="input" value={picName} onChange={(e) => setPicName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-xs">Mulai</label>
              <input type="date" className="input" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Selesai</label>
              <input type="date" className="input" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs">Catatan</label>
            <textarea
              className="input min-h-[70px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kendala, material menunggu, hasil pemeriksaan…"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              className="btn-primary"
              onClick={() =>
                onPatch({
                  picName: picName || null,
                  notes: notes || null,
                  startedAt: startedAt || null,
                  finishedAt: finishedAt || null
                })
              }
            >
              {busy ? 'Menyimpan…' : 'Simpan tahapan'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function PaymentSection({
  workOrderId,
  detail,
  editable,
  onDetail,
  onError
}: {
  workOrderId: string;
  detail: WorkOrderDetail;
  editable: boolean;
  onDetail: (detail: WorkOrderDetail) => void;
  onError: (message: string | null) => void;
}) {
  const [form, setForm] = useState({
    label: '',
    amountIdr: '',
    method: 'transfer' as PaymentMethod,
    paidAt: new Date().toISOString().slice(0, 10),
    reference: ''
  });
  const [saving, setSaving] = useState(false);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/panel/work-orders/${workOrderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          amountIdr: Number(form.amountIdr || 0),
          method: form.method,
          paidAt: form.paidAt,
          reference: form.reference || null
        })
      });
      const data = (await res.json()) as { detail?: WorkOrderDetail; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pembayaran.');
      if (data.detail) onDetail(data.detail);
      setForm({ ...form, label: '', amountIdr: '', reference: '' });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan pembayaran.');
    } finally {
      setSaving(false);
    }
  }

  async function removePayment(paymentId: string) {
    if (!confirm('Hapus catatan pembayaran ini? Nilai piutang akan ikut berubah.')) return;
    onError(null);
    try {
      const res = await fetch(`/api/panel/work-orders/${workOrderId}/payments/${paymentId}`, { method: 'DELETE' });
      const data = (await res.json()) as { detail?: WorkOrderDetail; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pembayaran.');
      if (data.detail) onDetail(data.detail);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menghapus pembayaran.');
    }
  }

  const paidPercent =
    detail.workOrder.contractValueIdr > 0
      ? Math.round((detail.paidTotal / detail.workOrder.contractValueIdr) * 100)
      : 0;

  return (
    <section className="card">
      <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Pembayaran</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400">Nilai kontrak</p>
          <p className="text-lg font-black tabular-nums">{formatIdr(detail.workOrder.contractValueIdr)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400">Sudah dibayar ({paidPercent}%)</p>
          <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatIdr(detail.paidTotal)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-xs text-slate-400">Sisa tagihan</p>
          <p
            className={`text-lg font-black tabular-nums ${
              detail.outstanding > 0 ? 'text-gold-600 dark:text-gold-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatIdr(detail.outstanding)}
          </p>
        </div>
      </div>

      {editable && (
        <form onSubmit={addPayment} className="mt-5 grid gap-3 sm:grid-cols-5">
          <input
            className="input sm:col-span-1"
            required
            placeholder="DP / Termin 1"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <input
            type="number"
            min={1}
            step={1000}
            className="input"
            required
            placeholder="Nominal"
            value={form.amountIdr}
            onChange={(e) => setForm({ ...form, amountIdr: e.target.value })}
          />
          <select
            className="input"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
            aria-label="Metode pembayaran"
          >
            {PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABEL[value]}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input"
            required
            value={form.paidAt}
            onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            aria-label="Tanggal bayar"
          />
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan…' : '+ Catat'}
          </button>
        </form>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Termin</th>
              <th>Nominal</th>
              <th>Metode</th>
              <th>Tanggal</th>
              <th>Referensi</th>
              <th>Cetak</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {detail.payments.map((payment) => (
              <tr key={payment.id}>
                <td className="font-medium">{payment.label}</td>
                <td className="tabular-nums">{formatIdr(payment.amountIdr)}</td>
                <td>{PAYMENT_METHOD_LABEL[payment.method]}</td>
                <td>{formatDate(payment.paidAt)}</td>
                <td className="text-slate-400">{payment.reference || '—'}</td>
                <td className="whitespace-nowrap">
                  {/* Slip dan bukti pembayaran dicetak dari baris pembayaran ini. */}
                  <a
                    href={`/api/panel/dokumen/slip-pembayaran/${payment.id}?format=pdf`}
                    download
                    className="text-xs font-semibold text-quantum-600 hover:underline"
                  >
                    Slip
                  </a>
                  <a
                    href={`/api/panel/dokumen/bukti-pembayaran/${payment.id}?format=pdf`}
                    download
                    className="ml-3 text-xs font-semibold text-quantum-600 hover:underline"
                  >
                    Bukti
                  </a>
                </td>
                {editable && (
                  <td className="text-right">
                    <button onClick={() => removePayment(payment.id)} className="text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {detail.payments.length === 0 && (
              <tr>
                <td colSpan={editable ? 7 : 6} className="py-6 text-center text-slate-400">
                  Belum ada pembayaran tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
