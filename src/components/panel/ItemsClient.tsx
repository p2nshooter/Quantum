'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr } from '@/lib/format';
import { ITEM_KINDS, ITEM_KIND_LABEL, type ItemKind } from '@/lib/karoseri/constants';

export type ItemRow = {
  id: string;
  code: string;
  name: string;
  kind: ItemKind;
  unit: string;
  costPriceIdr: number;
  sellPriceIdr: number;
  stockQty: number;
  minStockQty: number;
  showOnLanding: boolean;
  active: boolean;
};

const EMPTY = {
  code: '',
  name: '',
  kind: 'barang' as ItemKind,
  unit: 'pcs',
  costPriceIdr: '',
  sellPriceIdr: '',
  minStockQty: '0',
  showOnLanding: false,
  active: true
};

export function ItemsClient({ initialItems, canWrite }: { initialItems: ItemRow[]; canWrite: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialItems);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const lowStock = useMemo(
    () => rows.filter((r) => r.kind === 'barang' && r.active && r.stockQty <= r.minStockQty),
    [rows]
  );
  const stockValue = useMemo(
    () => rows.reduce((sum, r) => (r.kind === 'barang' ? sum + r.stockQty * r.costPriceIdr : sum), 0),
    [rows]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(term));
  }, [rows, search]);

  function startEdit(item: ItemRow) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      kind: item.kind,
      unit: item.unit,
      costPriceIdr: String(item.costPriceIdr),
      sellPriceIdr: String(item.sellPriceIdr),
      minStockQty: String(item.minStockQty),
      showOnLanding: item.showOnLanding,
      active: item.active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      code: form.code.toUpperCase(),
      name: form.name,
      kind: form.kind,
      unit: form.unit || 'pcs',
      costPriceIdr: Number(form.costPriceIdr || 0),
      sellPriceIdr: Number(form.sellPriceIdr || 0),
      minStockQty: Number(form.minStockQty || 0),
      showOnLanding: form.showOnLanding,
      active: form.active
    };

    try {
      const res = await fetch(editingId ? `/api/panel/barang/${editingId}` : '/api/panel/barang', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');

      setRows((prev) =>
        editingId
          ? prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r))
          : [...prev, { ...payload, id: data.id!, stockQty: 0 }].sort((a, b) => a.name.localeCompare(b.name))
      );
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function adjustStock(item: ItemRow) {
    const raw = prompt(
      `Stok fisik ${item.name} hasil hitung ulang (stok sistem sekarang ${item.stockQty} ${item.unit})`,
      String(item.stockQty)
    );
    if (raw === null) return;
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty < 0) {
      setError('Jumlah stok tidak valid.');
      return;
    }

    setError(null);
    try {
      const res = await fetch(`/api/panel/barang/${item.id}/stok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'penyesuaian',
          qty,
          unitCostIdr: item.costPriceIdr,
          movedAt: new Date().toISOString().slice(0, 10),
          notes: 'Penyesuaian hasil stok opname'
        })
      });
      const data = (await res.json()) as { stockQty?: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyesuaikan stok.');
      setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, stockQty: data.stockQty ?? qty } : r)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyesuaikan stok.');
    }
  }

  async function remove(item: ItemRow) {
    if (!confirm(`Hapus ${item.name}?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/barang/${item.id}`, { method: 'DELETE' });
      const data = (await res.json()) as { deactivated?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus.');

      if (data.deactivated) {
        setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, active: false } : r)));
        alert(data.message);
      } else {
        setRows((prev) => prev.filter((r) => r.id !== item.id));
      }
      if (editingId === item.id) resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Nilai persediaan</p>
          <p className="mt-1 text-xl font-black tabular-nums text-slate-900 dark:text-white">{formatIdr(stockValue)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-400">Barang menipis</p>
          <p className={`mt-1 text-xl font-black tabular-nums ${lowStock.length ? 'text-amber-600' : 'text-emerald-600'}`}>
            {lowStock.length} item
          </p>
          {lowStock.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">{lowStock.map((r) => r.name).slice(0, 4).join(', ')}</p>
          )}
        </div>
      </div>

      {canWrite && (
        <form onSubmit={save} className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">
            {editingId ? 'Ubah barang / jasa' : 'Tambah barang / jasa'}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="input uppercase"
              required
              placeholder="Kode (OLI-10W40) *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <input
              className="input lg:col-span-2"
              required
              placeholder="Nama barang / jasa *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="input"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as ItemKind })}
              aria-label="Jenis"
            >
              {ITEM_KINDS.map((k) => (
                <option key={k} value={k}>
                  {ITEM_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Satuan (pcs/liter/jasa)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              aria-label="Satuan"
            />
            <input
              type="number"
              min={0}
              step={1000}
              className="input"
              placeholder="Harga modal (Rp)"
              value={form.costPriceIdr}
              onChange={(e) => setForm({ ...form, costPriceIdr: e.target.value })}
            />
            <input
              type="number"
              min={0}
              step={1000}
              className="input"
              placeholder="Harga jual (Rp)"
              value={form.sellPriceIdr}
              onChange={(e) => setForm({ ...form, sellPriceIdr: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className="input"
              placeholder="Stok minimum"
              value={form.minStockQty}
              onChange={(e) => setForm({ ...form, minStockQty: e.target.value })}
              aria-label="Stok minimum"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.showOnLanding}
                onChange={(e) => setForm({ ...form, showOnLanding: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Tampilkan di daftar harga halaman depan
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Aktif
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : '+ Tambah'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary">
                Batal
              </button>
            )}
          </div>
        </form>
      )}

      <input
        className="input"
        placeholder="Cari kode atau nama…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cari barang"
      />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Jenis</th>
              <th className="text-right">Modal</th>
              <th className="text-right">Jual</th>
              <th className="text-right">Stok</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className={item.active ? '' : 'opacity-50'}>
                <td className="font-mono text-xs">{item.code}</td>
                <td>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{item.name}</div>
                  {item.showOnLanding && <div className="text-[11px] text-quantum-600">tampil di daftar harga</div>}
                </td>
                <td className="text-xs">{ITEM_KIND_LABEL[item.kind]}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(item.costPriceIdr)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">{formatIdr(item.sellPriceIdr)}</td>
                <td className="whitespace-nowrap text-right tabular-nums">
                  {item.kind === 'barang' ? (
                    <span className={item.stockQty <= item.minStockQty ? 'font-bold text-amber-600' : ''}>
                      {item.stockQty} {item.unit}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {canWrite && (
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => startEdit(item)} className="text-xs font-semibold text-quantum-600 hover:underline">
                      Ubah
                    </button>
                    {item.kind === 'barang' && (
                      <button onClick={() => adjustStock(item)} className="ml-3 text-xs font-semibold text-slate-500 hover:underline">
                        Opname
                      </button>
                    )}
                    <button onClick={() => remove(item)} className="ml-3 text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 7 : 6} className="py-8 text-center text-slate-400">
                  Tidak ada barang yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
