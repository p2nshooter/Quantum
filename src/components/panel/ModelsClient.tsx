'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr } from '@/lib/format';
import { UNIT_TYPES, UNIT_TYPE_LABEL, type UnitType } from '@/lib/karoseri/constants';

type BodyModel = {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  description: string | null;
  basePriceIdr: number;
  estimatedDays: number;
  active: boolean;
};

const EMPTY = {
  code: '',
  name: '',
  unitType: 'bus_besar' as UnitType,
  description: '',
  basePriceIdr: '',
  estimatedDays: '30',
  active: true
};

export function ModelsClient({ initialModels, canDelete }: { initialModels: BodyModel[]; canDelete: boolean }) {
  const router = useRouter();
  const [models, setModels] = useState(initialModels);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(model: BodyModel) {
    setEditingId(model.id);
    setForm({
      code: model.code,
      name: model.name,
      unitType: model.unitType,
      description: model.description ?? '',
      basePriceIdr: String(model.basePriceIdr),
      estimatedDays: String(model.estimatedDays),
      active: model.active
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
      unitType: form.unitType,
      description: form.description || null,
      basePriceIdr: Number(form.basePriceIdr || 0),
      estimatedDays: Number(form.estimatedDays || 30),
      active: form.active
    };

    try {
      const res = await fetch(editingId ? `/api/panel/models/${editingId}` : '/api/panel/models', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan model.');

      if (editingId) {
        setModels((prev) => prev.map((m) => (m.id === editingId ? { ...payload, id: editingId } : m)));
      } else if (data.id) {
        setModels((prev) => [...prev, { ...payload, id: data.id! }].sort((a, b) => a.code.localeCompare(b.code)));
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan model.');
    } finally {
      setSaving(false);
    }
  }

  async function importPresets() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/panel/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: true })
      });
      const data = (await res.json()) as { inserted?: number; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal memuat preset.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat preset.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus model ini?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/models/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus model.');
      setModels((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus model.');
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 dark:text-white">{editingId ? 'Ubah model' : 'Tambah model bodi'}</h2>
          {models.length === 0 && (
            <button type="button" onClick={importPresets} disabled={saving} className="btn-secondary">
              Muat model bawaan
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            className="input uppercase"
            required
            placeholder="Kode (BUS-HD-59) *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            className="input lg:col-span-2"
            required
            placeholder="Nama model *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="input"
            value={form.unitType}
            onChange={(e) => setForm({ ...form, unitType: e.target.value as UnitType })}
            aria-label="Tipe unit"
          >
            {UNIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {UNIT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step={1000}
            className="input"
            placeholder="Harga dasar (Rp)"
            value={form.basePriceIdr}
            onChange={(e) => setForm({ ...form, basePriceIdr: e.target.value })}
          />
          <input
            type="number"
            min={1}
            max={730}
            className="input"
            placeholder="Estimasi hari kerja"
            value={form.estimatedDays}
            onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
          />
        </div>

        <textarea
          className="input min-h-[70px]"
          placeholder="Deskripsi singkat yang tampil di katalog publik"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tampilkan di katalog publik
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : '+ Tambah model'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Model</th>
              <th>Tipe unit</th>
              <th>Harga dasar</th>
              <th>Estimasi</th>
              <th>Katalog</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id}>
                <td className="font-mono text-xs">{model.code}</td>
                <td>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{model.name}</div>
                  {model.description && (
                    <div className="max-w-sm truncate text-xs text-slate-400">{model.description}</div>
                  )}
                </td>
                <td>{UNIT_TYPE_LABEL[model.unitType]}</td>
                <td className="tabular-nums">{formatIdr(model.basePriceIdr)}</td>
                <td>{model.estimatedDays} hari</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      model.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {model.active ? 'Tampil' : 'Nonaktif'}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => startEdit(model)} className="text-xs font-semibold text-quantum-600 hover:underline">
                    Ubah
                  </button>
                  {canDelete && (
                    <button onClick={() => remove(model.id)} className="ml-3 text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Katalog masih kosong. Gunakan tombol &ldquo;Muat model bawaan&rdquo; untuk mengisi cepat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
