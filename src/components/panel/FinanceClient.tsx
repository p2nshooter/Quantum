'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr, formatDate } from '@/lib/format';
import {
  CAPITAL_TYPES,
  CAPITAL_TYPE_LABEL,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  type CapitalType,
  type ExpenseCategory,
  type PaymentMethod
} from '@/lib/karoseri/constants';

export type ExpenseRow = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amountIdr: number;
  vendorName: string | null;
  spentAt: Date | string;
  paidAt: Date | string | null;
  dueDate: Date | string | null;
  method: PaymentMethod | null;
  notes: string | null;
};

export type CapitalRow = {
  id: string;
  type: CapitalType;
  ownerName: string;
  amountIdr: number;
  method: PaymentMethod;
  entryAt: Date | string;
  notes: string | null;
};

export type PurchaseRow = {
  id: string;
  purchaseNumber: string;
  invoiceNumber: string | null;
  supplierName: string | null;
  totalIdr: number;
  paidIdr: number;
  purchasedAt: Date | string;
  dueDate: Date | string | null;
};

export type ItemOption = { id: string; code: string; name: string; unit: string; costPriceIdr: number };
export type SupplierOption = { id: string; name: string };

type Tab = 'biaya' | 'modal' | 'pembelian';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'biaya', label: 'Biaya operasional', icon: '🧾' },
  { key: 'modal', label: 'Modal & prive', icon: '🏦' },
  { key: 'pembelian', label: 'Pembelian barang', icon: '📦' }
];

const today = () => new Date().toISOString().slice(0, 10);

export function FinanceClient({
  initialExpenses,
  initialCapital,
  initialPurchases,
  itemOptions,
  supplierOptions,
  canWrite
}: {
  initialExpenses: ExpenseRow[];
  initialCapital: CapitalRow[];
  initialPurchases: PurchaseRow[];
  itemOptions: ItemOption[];
  supplierOptions: SupplierOption[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<Tab>('biaya');

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-quantum-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'biaya' && <ExpensesTab initialRows={initialExpenses} canWrite={canWrite} />}
      {tab === 'modal' && <CapitalTab initialRows={initialCapital} canWrite={canWrite} />}
      {tab === 'pembelian' && (
        <PurchasesTab
          initialRows={initialPurchases}
          itemOptions={itemOptions}
          supplierOptions={supplierOptions}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}

/* --- Biaya operasional ---------------------------------------------------- */

function ExpensesTab({ initialRows, canWrite }: { initialRows: ExpenseRow[]; canWrite: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState({
    category: 'lainnya' as ExpenseCategory,
    description: '',
    amountIdr: '',
    vendorName: '',
    spentAt: today(),
    paidAt: today(),
    dueDate: '',
    method: 'tunai' as PaymentMethod,
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.amountIdr, 0), [rows]);
  const unpaid = useMemo(() => rows.filter((r) => !r.paidAt).reduce((sum, r) => sum + r.amountIdr, 0), [rows]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/panel/biaya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          description: form.description,
          amountIdr: Number(form.amountIdr || 0),
          vendorName: form.vendorName || null,
          spentAt: form.spentAt,
          // Tanggal bayar kosong berarti biaya ini masih jadi utang usaha.
          paidAt: form.paidAt || null,
          dueDate: form.dueDate || null,
          method: form.paidAt ? form.method : null,
          notes: form.notes || null
        })
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan biaya.');

      setRows((prev) => [
        {
          id: data.id!,
          category: form.category,
          description: form.description,
          amountIdr: Number(form.amountIdr || 0),
          vendorName: form.vendorName || null,
          spentAt: form.spentAt,
          paidAt: form.paidAt || null,
          dueDate: form.dueDate || null,
          method: form.paidAt ? form.method : null,
          notes: form.notes || null
        },
        ...prev
      ]);
      setForm({ ...form, description: '', amountIdr: '', vendorName: '', notes: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan biaya.');
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/panel/biaya/${id}`, { method: 'PATCH' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menandai lunas.');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, paidAt: new Date().toISOString() } : r)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menandai lunas.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus catatan biaya ini?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/biaya/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus biaya.');
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus biaya.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Total biaya tercatat" value={formatIdr(total)} />
        <SummaryTile label="Belum dibayar (utang)" value={formatIdr(unpaid)} tone={unpaid > 0 ? 'warn' : 'ok'} />
      </div>

      {canWrite && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Catat biaya</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              aria-label="Kategori biaya"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <input
              className="input lg:col-span-2"
              required
              placeholder="Keterangan biaya *"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              type="number"
              min={1}
              step={1000}
              className="input"
              required
              placeholder="Nominal (Rp) *"
              value={form.amountIdr}
              onChange={(e) => setForm({ ...form, amountIdr: e.target.value })}
            />
            <input
              className="input"
              placeholder="Penerima / vendor"
              value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
            />
            <select
              className="input"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
              aria-label="Metode pembayaran"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Tanggal biaya *
              <input
                type="date"
                required
                className="input mt-1"
                value={form.spentAt}
                onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Tanggal bayar (kosong = utang)
              <input
                type="date"
                className="input mt-1"
                value={form.paidAt}
                onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Jatuh tempo
              <input
                type="date"
                className="input mt-1"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan…' : '+ Catat biaya'}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kategori</th>
              <th>Keterangan</th>
              <th className="text-right">Nominal</th>
              <th>Status</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap">{formatDate(row.spentAt)}</td>
                <td className="whitespace-nowrap text-xs">{EXPENSE_CATEGORY_LABEL[row.category]}</td>
                <td>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{row.description}</div>
                  {row.vendorName && <div className="text-xs text-slate-400">{row.vendorName}</div>}
                </td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(row.amountIdr)}</td>
                <td className="whitespace-nowrap">
                  {row.paidAt ? (
                    <span className="text-xs font-semibold text-emerald-600">Lunas {formatDate(row.paidAt)}</span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600">
                      Utang{row.dueDate ? ` · tempo ${formatDate(row.dueDate)}` : ''}
                    </span>
                  )}
                </td>
                {canWrite && (
                  <td className="whitespace-nowrap text-right">
                    {!row.paidAt && (
                      <button onClick={() => markPaid(row.id)} className="text-xs font-semibold text-quantum-600 hover:underline">
                        Tandai lunas
                      </button>
                    )}
                    <button onClick={() => remove(row.id)} className="ml-3 text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 6 : 5} className="py-8 text-center text-slate-400">
                  Belum ada biaya tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Modal & prive -------------------------------------------------------- */

function CapitalTab({ initialRows, canWrite }: { initialRows: CapitalRow[]; canWrite: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState({
    type: 'setoran' as CapitalType,
    ownerName: '',
    amountIdr: '',
    method: 'transfer' as PaymentMethod,
    entryAt: today(),
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const balance = useMemo(
    () => rows.reduce((sum, r) => (r.type === 'setoran' ? sum + r.amountIdr : sum - r.amountIdr), 0),
    [rows]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/panel/modal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          ownerName: form.ownerName,
          amountIdr: Number(form.amountIdr || 0),
          method: form.method,
          entryAt: form.entryAt,
          notes: form.notes || null
        })
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan modal.');

      setRows((prev) => [
        {
          id: data.id!,
          type: form.type,
          ownerName: form.ownerName,
          amountIdr: Number(form.amountIdr || 0),
          method: form.method,
          entryAt: form.entryAt,
          notes: form.notes || null
        },
        ...prev
      ]);
      setForm({ ...form, ownerName: '', amountIdr: '', notes: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan modal.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus catatan modal ini? Saldo kas di laporan ikut berubah.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/modal/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus.');
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus.');
    }
  }

  return (
    <div className="space-y-6">
      <SummaryTile label="Modal bersih tertanam" value={formatIdr(balance)} tone={balance < 0 ? 'warn' : 'ok'} />

      {canWrite && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Catat setoran / penarikan modal</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CapitalType })}
              aria-label="Jenis"
            >
              {CAPITAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CAPITAL_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              className="input"
              required
              placeholder="Nama pemilik *"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            />
            <input
              type="number"
              min={1}
              step={100000}
              className="input"
              required
              placeholder="Nominal (Rp) *"
              value={form.amountIdr}
              onChange={(e) => setForm({ ...form, amountIdr: e.target.value })}
            />
            <select
              className="input"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
              aria-label="Metode"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Tanggal *
              <input
                type="date"
                required
                className="input mt-1"
                value={form.entryAt}
                onChange={(e) => setForm({ ...form, entryAt: e.target.value })}
              />
            </label>
            <input
              className="input"
              placeholder="Catatan"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan…' : '+ Catat modal'}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Pemilik</th>
              <th>Metode</th>
              <th className="text-right">Nominal</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap">{formatDate(row.entryAt)}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.type === 'setoran'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}
                  >
                    {CAPITAL_TYPE_LABEL[row.type]}
                  </span>
                </td>
                <td>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{row.ownerName}</div>
                  {row.notes && <div className="text-xs text-slate-400">{row.notes}</div>}
                </td>
                <td className="text-xs">{PAYMENT_METHOD_LABEL[row.method]}</td>
                <td
                  className={`whitespace-nowrap text-right tabular-nums ${
                    row.type === 'setoran' ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {row.type === 'setoran' ? '+' : '−'} {formatIdr(row.amountIdr)}
                </td>
                {canWrite && (
                  <td className="text-right">
                    <button onClick={() => remove(row.id)} className="text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 6 : 5} className="py-8 text-center text-slate-400">
                  Belum ada catatan modal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Pembelian barang ----------------------------------------------------- */

type PurchaseLine = { itemId: string; name: string; qty: string; unitCostIdr: string };

const EMPTY_LINE: PurchaseLine = { itemId: '', name: '', qty: '1', unitCostIdr: '' };

function PurchasesTab({
  initialRows,
  itemOptions,
  supplierOptions,
  canWrite
}: {
  initialRows: PurchaseRow[];
  itemOptions: ItemOption[];
  supplierOptions: SupplierOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    supplierName: '',
    invoiceNumber: '',
    purchasedAt: today(),
    dueDate: '',
    paidIdr: '',
    notes: ''
  });
  const [lines, setLines] = useState<PurchaseLine[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.unitCostIdr || 0), 0),
    [lines]
  );
  const outstanding = useMemo(() => rows.reduce((sum, r) => sum + (r.totalIdr - r.paidIdr), 0), [rows]);

  function pickItem(index: number, itemId: string) {
    const master = itemOptions.find((i) => i.id === itemId);
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              itemId,
              // Nama dan harga ikut terisi dari master supaya operator tidak
              // mengetik ulang, tapi tetap boleh diubah untuk harga nego.
              name: master ? master.name : line.name,
              unitCostIdr: master ? String(master.costPriceIdr) : line.unitCostIdr
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
      const res = await fetch('/api/panel/pembelian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: form.supplierId || null,
          supplierName: form.supplierName || supplierOptions.find((s) => s.id === form.supplierId)?.name || null,
          invoiceNumber: form.invoiceNumber || null,
          purchasedAt: form.purchasedAt,
          dueDate: form.dueDate || null,
          paidIdr: Number(form.paidIdr || 0),
          notes: form.notes || null,
          items: lines
            .filter((l) => l.name.trim() && Number(l.qty) > 0)
            .map((l) => ({
              itemId: l.itemId || null,
              name: l.name,
              qty: Number(l.qty),
              unitCostIdr: Number(l.unitCostIdr || 0)
            }))
        })
      });
      const data = (await res.json()) as { id?: string; purchaseNumber?: string; totalIdr?: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pembelian.');

      setRows((prev) => [
        {
          id: data.id!,
          purchaseNumber: data.purchaseNumber!,
          invoiceNumber: form.invoiceNumber || null,
          supplierName: form.supplierName || supplierOptions.find((s) => s.id === form.supplierId)?.name || null,
          totalIdr: data.totalIdr ?? total,
          paidIdr: Number(form.paidIdr || 0),
          purchasedAt: form.purchasedAt,
          dueDate: form.dueDate || null
        },
        ...prev
      ]);
      setForm({ ...form, supplierId: '', supplierName: '', invoiceNumber: '', paidIdr: '', notes: '' });
      setLines([{ ...EMPTY_LINE }]);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pembelian.');
    } finally {
      setSaving(false);
    }
  }

  async function pay(row: PurchaseRow) {
    const remaining = row.totalIdr - row.paidIdr;
    const raw = prompt(`Nominal pembayaran untuk ${row.purchaseNumber} (sisa ${formatIdr(remaining)})`, String(remaining));
    if (!raw) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/pembelian/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountIdr: Number(raw) })
      });
      const data = (await res.json()) as { paidIdr?: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal mencatat pembayaran.');
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, paidIdr: data.paidIdr ?? r.paidIdr } : r)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pembayaran.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Batalkan pembelian ini? Stok barangnya akan dikembalikan.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/pembelian/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan pembelian.');
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membatalkan pembelian.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Nilai pembelian tercatat" value={formatIdr(rows.reduce((s, r) => s + r.totalIdr, 0))} />
        <SummaryTile label="Utang ke supplier" value={formatIdr(outstanding)} tone={outstanding > 0 ? 'warn' : 'ok'} />
      </div>

      {canWrite && !open && (
        <button onClick={() => setOpen(true)} className="btn-primary">
          + Catat pembelian
        </button>
      )}

      {canWrite && open && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Pembelian barang</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="input"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              aria-label="Supplier terdaftar"
            >
              <option value="">— Supplier terdaftar —</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Atau tulis nama supplier"
              value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
            />
            <input
              className="input"
              placeholder="No. nota / invoice supplier"
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            />
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Tanggal beli *
              <input
                type="date"
                required
                className="input mt-1"
                value={form.purchasedAt}
                onChange={(e) => setForm({ ...form, purchasedAt: e.target.value })}
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Jatuh tempo
              <input
                type="date"
                className="input mt-1"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              Dibayar sekarang (Rp)
              <input
                type="number"
                min={0}
                step={10000}
                className="input mt-1"
                value={form.paidIdr}
                onChange={(e) => setForm({ ...form, paidIdr: e.target.value })}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Barang dibeli</p>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-12">
                <select
                  className="input sm:col-span-3"
                  value={line.itemId}
                  onChange={(e) => pickItem(index, e.target.value)}
                  aria-label="Barang master"
                >
                  <option value="">— Barang baru —</option>
                  {itemOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input sm:col-span-4"
                  placeholder="Nama barang *"
                  value={line.name}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)))
                  }
                />
                <input
                  type="number"
                  min={1}
                  className="input sm:col-span-2"
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
                  value={line.unitCostIdr}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitCostIdr: e.target.value } : l)))
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
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
              className="btn-secondary"
            >
              + Baris barang
            </button>
          </div>

          <input
            className="input"
            placeholder="Catatan"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <p className="text-right text-sm font-bold text-slate-900 dark:text-white">
            Total pembelian: {formatIdr(total)}
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Menyimpan…' : 'Simpan pembelian'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Batal
            </button>
          </div>
        </form>
      )}

      {error && !open && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>No. pembelian</th>
              <th>Tanggal</th>
              <th>Supplier</th>
              <th className="text-right">Total</th>
              <th className="text-right">Sisa utang</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const remaining = row.totalIdr - row.paidIdr;
              return (
                <tr key={row.id}>
                  <td className="whitespace-nowrap font-mono text-xs">{row.purchaseNumber}</td>
                  <td className="whitespace-nowrap">{formatDate(row.purchasedAt)}</td>
                  <td>
                    <div className="font-medium text-slate-800 dark:text-slate-100">{row.supplierName ?? '—'}</div>
                    {row.invoiceNumber && <div className="text-xs text-slate-400">Nota {row.invoiceNumber}</div>}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(row.totalIdr)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {remaining > 0 ? (
                      <span className="font-semibold text-amber-600">
                        {formatIdr(remaining)}
                        {row.dueDate && <span className="block text-[11px] font-normal text-slate-400">tempo {formatDate(row.dueDate)}</span>}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">Lunas</span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="whitespace-nowrap text-right">
                      {remaining > 0 && (
                        <button onClick={() => pay(row)} className="text-xs font-semibold text-quantum-600 hover:underline">
                          Bayar
                        </button>
                      )}
                      <button onClick={() => remove(row.id)} className="ml-3 text-xs text-red-500 hover:underline">
                        Batalkan
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 6 : 5} className="py-8 text-center text-slate-400">
                  Belum ada pembelian tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'ok' | 'warn' }) {
  const toneClass =
    tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-900 dark:text-white';
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
