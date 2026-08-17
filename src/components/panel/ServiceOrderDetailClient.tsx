'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatIdr, formatDate, formatDateTime } from '@/lib/format';
import {
  ITEM_KIND_LABEL,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  type ItemKind,
  type PaymentMethod,
  type ServiceStatus
} from '@/lib/karoseri/constants';
import { STATUS_STYLE } from '@/components/panel/ServiceOrdersClient';
import { PrintMenu } from '@/components/panel/PrintMenu';

type Line = {
  id: string;
  name: string;
  kind: ItemKind;
  qty: number;
  unitPriceIdr: number;
  subtotalIdr: number;
};

type Payment = {
  id: string;
  label: string;
  amountIdr: number;
  method: PaymentMethod;
  paidAt: Date | string;
  reference: string | null;
};

export type ServiceOrderDetail = {
  order: {
    id: string;
    orderNumber: string;
    policeNumber: string;
    vehicleBrand: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    odometerKm: number | null;
    complaint: string | null;
    diagnosis: string | null;
    mechanicName: string | null;
    status: ServiceStatus;
    subtotalIdr: number;
    discountIdr: number;
    taxPercent: number;
    taxIdr: number;
    totalIdr: number;
    checkInAt: Date | string | null;
    finishedAt: Date | string | null;
    notes: string | null;
  };
  customer: { id: string; name: string; company: string | null; phone: string | null };
  lines: Line[];
  payments: Payment[];
  paidTotal: number;
  outstanding: number;
  grossProfit: number;
};

export function ServiceOrderDetailClient({
  initialDetail,
  canWrite,
  canPay,
  canDelete
}: {
  initialDetail: ServiceOrderDetail;
  canWrite: boolean;
  canPay: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState({
    status: initialDetail.order.status,
    diagnosis: initialDetail.order.diagnosis ?? '',
    mechanicName: initialDetail.order.mechanicName ?? '',
    notes: initialDetail.order.notes ?? ''
  });
  const [payment, setPayment] = useState({
    label: 'Pembayaran servis',
    amountIdr: '',
    method: 'tunai' as PaymentMethod,
    paidAt: new Date().toISOString().slice(0, 10),
    reference: ''
  });

  const { order, customer } = detail;

  async function saveWork(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/panel/servis/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: work.status,
          diagnosis: work.diagnosis || null,
          mechanicName: work.mechanicName || null,
          notes: work.notes || null
        })
      });
      const data = (await res.json()) as { detail?: ServiceOrderDetail; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');
      if (data.detail) setDetail(data.detail);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/panel/servis/${order.id}/pembayaran`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: payment.label,
          amountIdr: Number(payment.amountIdr || 0),
          method: payment.method,
          paidAt: payment.paidAt,
          reference: payment.reference || null,
          notes: null
        })
      });
      const data = (await res.json()) as { detail?: ServiceOrderDetail; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal mencatat pembayaran.');
      if (data.detail) setDetail(data.detail);
      setPayment({ ...payment, amountIdr: '', reference: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pembayaran.');
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(paymentId: string) {
    if (!confirm('Hapus pembayaran ini? Piutang pelanggan akan bertambah kembali.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/servis/${order.id}/pembayaran/${paymentId}`, { method: 'DELETE' });
      const data = (await res.json()) as { detail?: ServiceOrderDetail; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pembayaran.');
      if (data.detail) setDetail(data.detail);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pembayaran.');
    }
  }

  async function removeOrder() {
    if (!confirm(`Hapus order ${order.orderNumber}? Sparepart yang sudah keluar akan dikembalikan ke stok.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/servis/${order.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus order.');
      router.push('/panel/servis');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus order.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/panel/servis" className="no-print text-sm text-slate-500 hover:text-quantum-600">
            ← Semua order servis
          </Link>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {order.policeNumber} · {[order.vehicleBrand, order.vehicleModel, order.vehicleYear].filter(Boolean).join(' ') || 'Kendaraan tidak dirinci'}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[order.status]}`}>
            {SERVICE_STATUS_LABEL[order.status]}
          </span>
          <PrintMenu label="Kartu servis" jenis="kartu-servis" id={order.policeNumber} />
          {detail.outstanding > 0 && <PrintMenu label="Surat hutang" jenis="surat-hutang" id={order.id} />}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card">
            <h2 className="mb-3 font-bold text-slate-900 dark:text-white">Rincian pekerjaan</h2>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Pekerjaan / barang</th>
                    <th>Jenis</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Harga</th>
                    <th className="text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="font-medium text-slate-800 dark:text-slate-100">{line.name}</td>
                      <td className="text-xs">{ITEM_KIND_LABEL[line.kind]}</td>
                      <td className="text-right tabular-nums">{line.qty}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(line.unitPriceIdr)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(line.subtotalIdr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
              <Row label="Subtotal" value={formatIdr(order.subtotalIdr)} />
              {order.discountIdr > 0 && <Row label="Diskon" value={`− ${formatIdr(order.discountIdr)}`} />}
              {order.taxIdr > 0 && <Row label={`PPN ${order.taxPercent}%`} value={formatIdr(order.taxIdr)} />}
              <Row label="Total tagihan" value={formatIdr(order.totalIdr)} bold />
              <Row label="Sudah dibayar" value={formatIdr(detail.paidTotal)} />
              <Row
                label="Sisa"
                value={formatIdr(detail.outstanding)}
                tone={detail.outstanding > 0 ? 'warn' : 'ok'}
                bold
              />
            </div>
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">Pembayaran</h2>
              <span className="text-xs text-slate-400">{detail.payments.length} transaksi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Metode</th>
                    <th className="text-right">Nominal</th>
                    <th className="no-print" />
                  </tr>
                </thead>
                <tbody>
                  {detail.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{formatDate(p.paidAt)}</td>
                      <td>
                        <div className="font-medium text-slate-800 dark:text-slate-100">{p.label}</div>
                        {p.reference && <div className="text-xs text-slate-400">Ref {p.reference}</div>}
                      </td>
                      <td className="text-xs">{PAYMENT_METHOD_LABEL[p.method]}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(p.amountIdr)}</td>
                      <td className="no-print whitespace-nowrap text-right">
                        <PrintMenu label="Kuitansi" jenis="bukti-pembayaran" id={p.id} />
                        {canPay && (
                          <button onClick={() => removePayment(p.id)} className="ml-2 text-xs text-red-500 hover:underline">
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {detail.payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Belum ada pembayaran.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {canPay && detail.outstanding > 0 && (
              <form onSubmit={addPayment} className="no-print mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-12 dark:border-slate-800">
                <input
                  className="input sm:col-span-4"
                  required
                  placeholder="Keterangan"
                  value={payment.label}
                  onChange={(e) => setPayment({ ...payment, label: e.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  step={10000}
                  className="input sm:col-span-3"
                  required
                  placeholder="Nominal"
                  value={payment.amountIdr}
                  onChange={(e) => setPayment({ ...payment, amountIdr: e.target.value })}
                />
                <select
                  className="input sm:col-span-2"
                  value={payment.method}
                  onChange={(e) => setPayment({ ...payment, method: e.target.value as PaymentMethod })}
                  aria-label="Metode"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABEL[m]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input sm:col-span-2"
                  required
                  value={payment.paidAt}
                  onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })}
                  aria-label="Tanggal bayar"
                />
                <button type="submit" disabled={busy} className="btn-primary sm:col-span-1">
                  +
                </button>
              </form>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card space-y-1 text-sm">
            <h2 className="mb-2 font-bold text-slate-900 dark:text-white">Pelanggan &amp; unit</h2>
            <Info label="Pelanggan" value={customer.name} />
            {customer.company && <Info label="Perusahaan" value={customer.company} />}
            {customer.phone && <Info label="Telepon" value={customer.phone} />}
            <Info label="Masuk bengkel" value={formatDateTime(order.checkInAt)} />
            {order.finishedAt && <Info label="Selesai" value={formatDateTime(order.finishedAt)} />}
            {order.odometerKm !== null && <Info label="Kilometer" value={`${order.odometerKm.toLocaleString('id-ID')} km`} />}
            {order.complaint && (
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Keluhan</p>
                <p className="text-slate-700 dark:text-slate-200">{order.complaint}</p>
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="mb-2 font-bold text-slate-900 dark:text-white">Laba kotor order</h2>
            <p className={`text-2xl font-black tabular-nums ${detail.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatIdr(detail.grossProfit)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Nilai pekerjaan setelah dikurangi harga modal sparepart. Upah mekanik dihitung di biaya operasional bulanan.
            </p>
          </section>

          {canWrite && (
            <form onSubmit={saveWork} className="no-print card space-y-3">
              <h2 className="font-bold text-slate-900 dark:text-white">Perbarui pengerjaan</h2>
              <select
                className="input"
                value={work.status}
                onChange={(e) => setWork({ ...work, status: e.target.value as ServiceStatus })}
                aria-label="Status"
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Nama mekanik"
                value={work.mechanicName}
                onChange={(e) => setWork({ ...work, mechanicName: e.target.value })}
              />
              <textarea
                className="input min-h-[70px]"
                placeholder="Hasil pemeriksaan / diagnosa"
                value={work.diagnosis}
                onChange={(e) => setWork({ ...work, diagnosis: e.target.value })}
              />
              <textarea
                className="input min-h-[60px]"
                placeholder="Catatan internal"
                value={work.notes}
                onChange={(e) => setWork({ ...work, notes: e.target.value })}
              />
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Menyimpan…' : 'Simpan'}
              </button>
              {canDelete && (
                <button type="button" onClick={removeOrder} className="w-full text-xs text-red-500 hover:underline">
                  Hapus order ini
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'ok' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-100';
  return (
    <div className={`flex justify-between ${bold ? 'border-t border-slate-200 pt-1 font-bold dark:border-slate-700' : ''}`}>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
