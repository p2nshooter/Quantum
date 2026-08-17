'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatIdr, formatDate } from '@/lib/format';
import {
  ITEM_KINDS,
  ITEM_KIND_LABEL,
  SERVICE_OPEN_STATUSES,
  SERVICE_STATUSES,
  SERVICE_STATUS_LABEL,
  type ItemKind,
  type ServiceStatus
} from '@/lib/karoseri/constants';

export type ServiceOrderListRow = {
  id: string;
  orderNumber: string;
  policeNumber: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  status: ServiceStatus;
  totalIdr: number;
  checkInAt: Date | string | null;
  mechanicName: string | null;
  customerName: string;
  customerCompany: string | null;
  paidIdr: number;
};

export type CustomerOption = { id: string; name: string; company: string | null };
export type ServiceItemOption = {
  id: string;
  code: string;
  name: string;
  kind: ItemKind;
  unit: string;
  sellPriceIdr: number;
  stockQty: number;
};

export const STATUS_STYLE: Record<ServiceStatus, string> = {
  antrian: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  dikerjakan: 'bg-quantum-100 text-quantum-700 dark:bg-quantum-900/30 dark:text-quantum-300',
  menunggu_part: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  selesai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  diambil: 'bg-emerald-600 text-white',
  batal: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
};

type Line = { itemId: string; name: string; kind: ItemKind; qty: string; unitPriceIdr: string };

const EMPTY_LINE: Line = { itemId: '', name: '', kind: 'jasa', qty: '1', unitPriceIdr: '' };

export function ServiceOrdersClient({
  initialOrders,
  customerOptions,
  itemOptions,
  taxPercent,
  canWrite
}: {
  initialOrders: ServiceOrderListRow[];
  customerOptions: CustomerOption[];
  itemOptions: ServiceItemOption[];
  taxPercent: number;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'aktif' | 'semua'>('aktif');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customerId: '',
    policeNumber: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    odometerKm: '',
    complaint: '',
    mechanicName: '',
    discountIdr: '',
    notes: ''
  });
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitPriceIdr || 0), 0),
    [lines]
  );
  const afterDiscount = Math.max(0, subtotal - Number(form.discountIdr || 0));
  const taxIdr = Math.round((afterDiscount * taxPercent) / 100);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === 'aktif' && !SERVICE_OPEN_STATUSES.includes(o.status)) return false;
      if (!term) return true;
      return `${o.orderNumber} ${o.policeNumber} ${o.customerName} ${o.customerCompany ?? ''}`
        .toLowerCase()
        .includes(term);
    });
  }, [orders, filter, search]);

  const openCount = useMemo(() => orders.filter((o) => SERVICE_OPEN_STATUSES.includes(o.status)).length, [orders]);
  const receivable = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'batal')
        .reduce((sum, o) => sum + Math.max(0, o.totalIdr - o.paidIdr), 0),
    [orders]
  );

  function pickItem(index: number, itemId: string) {
    const master = itemOptions.find((i) => i.id === itemId);
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              itemId,
              name: master ? master.name : line.name,
              kind: master ? master.kind : line.kind,
              unitPriceIdr: master ? String(master.sellPriceIdr) : line.unitPriceIdr
            }
          : line
      )
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/panel/servis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: form.customerId,
          policeNumber: form.policeNumber,
          vehicleBrand: form.vehicleBrand || null,
          vehicleModel: form.vehicleModel || null,
          vehicleYear: form.vehicleYear ? Number(form.vehicleYear) : null,
          odometerKm: form.odometerKm ? Number(form.odometerKm) : null,
          complaint: form.complaint || null,
          diagnosis: null,
          mechanicName: form.mechanicName || null,
          status: 'antrian',
          discountIdr: Number(form.discountIdr || 0),
          notes: form.notes || null,
          lines: lines
            .filter((l) => l.name.trim() && Number(l.qty) > 0)
            .map((l) => ({
              itemId: l.itemId || null,
              name: l.name,
              kind: l.kind,
              qty: Number(l.qty),
              unitPriceIdr: Number(l.unitPriceIdr || 0)
            }))
        })
      });
      const data = (await res.json()) as { id?: string; orderNumber?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal membuat order servis.');

      const customer = customerOptions.find((c) => c.id === form.customerId);
      setOrders((prev) => [
        {
          id: data.id!,
          orderNumber: data.orderNumber!,
          policeNumber: form.policeNumber.toUpperCase(),
          vehicleBrand: form.vehicleBrand || null,
          vehicleModel: form.vehicleModel || null,
          status: 'antrian',
          totalIdr: afterDiscount + taxIdr,
          checkInAt: new Date().toISOString(),
          mechanicName: form.mechanicName || null,
          customerName: customer?.name ?? '—',
          customerCompany: customer?.company ?? null,
          paidIdr: 0
        },
        ...prev
      ]);
      setForm({ ...form, policeNumber: '', vehicleBrand: '', vehicleModel: '', vehicleYear: '', odometerKm: '', complaint: '', discountIdr: '', notes: '' });
      setLines([{ ...EMPTY_LINE }]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat order servis.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Unit di bengkel" value={`${openCount} unit`} />
        <Tile label="Order tercatat" value={`${orders.length} order`} />
        <Tile label="Piutang servis" value={formatIdr(receivable)} tone={receivable > 0 ? 'warn' : 'ok'} />
      </div>

      {canWrite && !open && (
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Order servis baru
        </button>
      )}

      {canWrite && open && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Order servis baru</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="input"
              required
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              aria-label="Pelanggan"
            >
              <option value="">— Pilih pelanggan * —</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
            <input
              className="input uppercase"
              required
              placeholder="Nomor polisi *"
              value={form.policeNumber}
              onChange={(e) => setForm({ ...form, policeNumber: e.target.value })}
            />
            <input
              className="input"
              placeholder="Nama mekanik"
              value={form.mechanicName}
              onChange={(e) => setForm({ ...form, mechanicName: e.target.value })}
            />
            <input
              className="input"
              placeholder="Merek (Hino, Mitsubishi…)"
              value={form.vehicleBrand}
              onChange={(e) => setForm({ ...form, vehicleBrand: e.target.value })}
            />
            <input
              className="input"
              placeholder="Tipe kendaraan"
              value={form.vehicleModel}
              onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
            />
            <input
              type="number"
              min={1950}
              max={2100}
              className="input"
              placeholder="Tahun"
              value={form.vehicleYear}
              onChange={(e) => setForm({ ...form, vehicleYear: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className="input"
              placeholder="Kilometer"
              value={form.odometerKm}
              onChange={(e) => setForm({ ...form, odometerKm: e.target.value })}
            />
            <input
              type="number"
              min={0}
              step={10000}
              className="input"
              placeholder="Diskon (Rp)"
              value={form.discountIdr}
              onChange={(e) => setForm({ ...form, discountIdr: e.target.value })}
            />
          </div>

          <textarea
            className="input min-h-[60px]"
            placeholder="Keluhan pelanggan"
            value={form.complaint}
            onChange={(e) => setForm({ ...form, complaint: e.target.value })}
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pekerjaan &amp; sparepart</p>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-12">
                <select
                  className="input sm:col-span-3"
                  value={line.itemId}
                  onChange={(e) => pickItem(index, e.target.value)}
                  aria-label="Ambil dari master"
                >
                  <option value="">— Isi manual —</option>
                  {itemOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                      {item.kind === 'barang' ? ` (stok ${item.stockQty})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  className="input sm:col-span-3"
                  placeholder="Nama pekerjaan / barang *"
                  value={line.name}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)))
                  }
                />
                <select
                  className="input sm:col-span-2"
                  value={line.kind}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, kind: e.target.value as ItemKind } : l))
                    )
                  }
                  aria-label="Jenis baris"
                >
                  {ITEM_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {ITEM_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="input sm:col-span-1"
                  placeholder="Qty"
                  value={line.qty}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, qty: e.target.value } : l)))
                  }
                  aria-label="Jumlah"
                />
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className="input sm:col-span-2"
                  placeholder="Harga satuan"
                  value={line.unitPriceIdr}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitPriceIdr: e.target.value } : l)))
                  }
                  aria-label="Harga satuan"
                />
                <button
                  type="button"
                  onClick={() => setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))}
                  className="text-sm text-red-500 sm:col-span-1"
                  aria-label="Hapus baris"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} className="btn-secondary">
              + Baris
            </button>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
            <Row label="Subtotal" value={formatIdr(subtotal)} />
            {Number(form.discountIdr) > 0 && <Row label="Diskon" value={`− ${formatIdr(Number(form.discountIdr))}`} />}
            {taxPercent > 0 && <Row label={`PPN ${taxPercent}%`} value={formatIdr(taxIdr)} />}
            <Row label="Total" value={formatIdr(afterDiscount + taxIdr)} bold />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Menyimpan…' : 'Simpan order servis'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('aktif')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            filter === 'aktif' ? 'bg-quantum-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Masih di bengkel
        </button>
        <button
          onClick={() => setFilter('semua')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            filter === 'semua' ? 'bg-quantum-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          Semua order
        </button>
        <input
          className="input flex-1"
          placeholder="Cari nomor order, plat, atau pelanggan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari order servis"
        />
      </div>

      {error && !open && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Order</th>
              <th>Kendaraan</th>
              <th>Pelanggan</th>
              <th>Status</th>
              <th className="text-right">Total</th>
              <th className="text-right">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => {
              const remaining = Math.max(0, order.totalIdr - order.paidIdr);
              return (
                <tr key={order.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/panel/servis/${order.id}`} className="font-mono text-xs font-semibold text-quantum-600 hover:underline">
                      {order.orderNumber}
                    </Link>
                    <div className="text-[11px] text-slate-400">{formatDate(order.checkInAt)}</div>
                  </td>
                  <td>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{order.policeNumber}</div>
                    <div className="text-xs text-slate-400">
                      {[order.vehicleBrand, order.vehicleModel].filter(Boolean).join(' ') || '—'}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm text-slate-700 dark:text-slate-200">{order.customerName}</div>
                    {order.customerCompany && <div className="text-xs text-slate-400">{order.customerCompany}</div>}
                  </td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
                      {SERVICE_STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(order.totalIdr)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {remaining > 0 ? (
                      <span className="font-semibold text-amber-600">{formatIdr(remaining)}</span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">Lunas</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  {filter === 'aktif' ? 'Tidak ada unit yang sedang dikerjakan.' : 'Belum ada order servis.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Status order diubah dari halaman detail. Status {SERVICE_STATUSES.filter((s) => s === 'selesai' || s === 'diambil').map((s) => SERVICE_STATUS_LABEL[s]).join(' / ')} yang menandai
        pendapatan diakui di laporan.
      </p>
    </div>
  );
}

function Tile({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'ok' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-900 dark:text-white';
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'mt-1 border-t border-slate-200 pt-1 font-bold dark:border-slate-700' : ''}`}>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular-nums text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
