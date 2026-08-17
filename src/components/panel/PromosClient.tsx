'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr, toDateInput } from '@/lib/format';
import { PROMO_KINDS, PROMO_KIND_LABEL, type PromoKind } from '@/lib/karoseri/constants';

export type PromoRow = {
  id: string;
  kind: PromoKind;
  title: string;
  description: string | null;
  emoji: string;
  normalPriceIdr: number | null;
  promoPriceIdr: number | null;
  ctaLabel: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  sortOrder: number;
  active: boolean;
};

const EMPTY = {
  kind: 'promo' as PromoKind,
  title: '',
  description: '',
  emoji: '🎉',
  normalPriceIdr: '',
  promoPriceIdr: '',
  ctaLabel: '',
  startsAt: '',
  endsAt: '',
  sortOrder: '0',
  active: true
};

const KIND_STYLE: Record<PromoKind, string> = {
  promo: 'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-300',
  event: 'bg-quantum-100 text-quantum-700 dark:bg-quantum-900/30 dark:text-quantum-300',
  pengumuman: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
};

export function PromosClient({ initialPromos }: { initialPromos: PromoRow[] }) {
  const router = useRouter();
  const [promos, setPromos] = useState(initialPromos);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(promo: PromoRow) {
    setEditingId(promo.id);
    setForm({
      kind: promo.kind,
      title: promo.title,
      description: promo.description ?? '',
      emoji: promo.emoji,
      normalPriceIdr: promo.normalPriceIdr === null ? '' : String(promo.normalPriceIdr),
      promoPriceIdr: promo.promoPriceIdr === null ? '' : String(promo.promoPriceIdr),
      ctaLabel: promo.ctaLabel ?? '',
      startsAt: toDateInput(promo.startsAt),
      endsAt: toDateInput(promo.endsAt),
      sortOrder: String(promo.sortOrder),
      active: promo.active
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
      kind: form.kind,
      title: form.title,
      description: form.description || null,
      emoji: form.emoji || '🎉',
      // Harga dikosongkan berarti promo tanpa angka — dikirim null, bukan 0,
      // supaya kartu di halaman publik tidak menampilkan "Rp 0".
      normalPriceIdr: form.normalPriceIdr === '' ? null : Number(form.normalPriceIdr),
      promoPriceIdr: form.promoPriceIdr === '' ? null : Number(form.promoPriceIdr),
      ctaLabel: form.ctaLabel || null,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      sortOrder: Number(form.sortOrder || 0),
      active: form.active
    };

    try {
      const res = await fetch(editingId ? `/api/panel/promo/${editingId}` : '/api/panel/promo', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');

      const next: PromoRow = {
        ...payload,
        id: editingId ?? data.id!,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt
      };
      setPromos((prev) =>
        (editingId ? prev.map((p) => (p.id === editingId ? next : p)) : [...prev, next]).sort(
          (a, b) => a.sortOrder - b.sortOrder
        )
      );
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus konten ini dari halaman depan?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/promo/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus.');
      setPromos((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus.');
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white">
          {editingId ? 'Ubah konten halaman depan' : 'Tambah promo / event'}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="input"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as PromoKind })}
            aria-label="Jenis konten"
          >
            {PROMO_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PROMO_KIND_LABEL[kind]}
              </option>
            ))}
          </select>
          <input
            className="input"
            maxLength={8}
            placeholder="Ikon (emoji)"
            value={form.emoji}
            onChange={(e) => setForm({ ...form, emoji: e.target.value })}
            aria-label="Ikon"
          />
          <input
            className="input lg:col-span-2"
            required
            placeholder="Judul *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            type="number"
            min={0}
            step={10000}
            className="input"
            placeholder="Harga normal (Rp)"
            value={form.normalPriceIdr}
            onChange={(e) => setForm({ ...form, normalPriceIdr: e.target.value })}
          />
          <input
            type="number"
            min={0}
            step={10000}
            className="input"
            placeholder="Harga promo (Rp)"
            value={form.promoPriceIdr}
            onChange={(e) => setForm({ ...form, promoPriceIdr: e.target.value })}
          />
          <input
            className="input"
            placeholder="Teks tombol (mis. Pesan sekarang)"
            value={form.ctaLabel}
            onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
          />
          <input
            type="number"
            min={0}
            max={999}
            className="input"
            placeholder="Urutan tampil"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            aria-label="Urutan tampil"
          />
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Mulai berlaku
            <input
              type="date"
              className="input mt-1"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </label>
          <label className="text-xs text-slate-500 dark:text-slate-400">
            Berakhir
            <input
              type="date"
              className="input mt-1"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </label>
        </div>

        <textarea
          className="input min-h-[70px]"
          placeholder="Keterangan yang tampil di kartu halaman depan"
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
          Tampilkan di halaman depan
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : '+ Tambah konten'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {promos.map((promo) => (
          <article key={promo.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <span className="text-2xl leading-none">{promo.emoji}</span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{promo.title}</h3>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_STYLE[promo.kind]}`}>
                    {PROMO_KIND_LABEL[promo.kind]}
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  promo.active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {promo.active ? 'Tampil' : 'Nonaktif'}
              </span>
            </div>

            {promo.description && <p className="text-sm text-slate-500 dark:text-slate-400">{promo.description}</p>}

            {promo.promoPriceIdr !== null && (
              <p className="text-sm">
                {promo.normalPriceIdr !== null && (
                  <span className="mr-2 text-slate-400 line-through">{formatIdr(promo.normalPriceIdr)}</span>
                )}
                <span className="font-bold text-quantum-600">{formatIdr(promo.promoPriceIdr)}</span>
              </p>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <span className="text-xs text-slate-400">Urutan {promo.sortOrder}</span>
              <div>
                <button onClick={() => startEdit(promo)} className="text-xs font-semibold text-quantum-600 hover:underline">
                  Ubah
                </button>
                <button onClick={() => remove(promo.id)} className="ml-3 text-xs text-red-500 hover:underline">
                  Hapus
                </button>
              </div>
            </div>
          </article>
        ))}
        {promos.length === 0 && (
          <p className="card text-center text-slate-400">
            Belum ada promo atau event. Konten yang ditambahkan di sini langsung tampil di halaman depan.
          </p>
        )}
      </div>
    </div>
  );
}
