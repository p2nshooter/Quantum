'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr } from '@/lib/format';
import { PPH_BASES, PPH_BASE_LABEL, type PphBase } from '@/lib/karoseri/constants';
import type { AppSettings } from '@/lib/settings';

export function SettingsClient({ initialSettings }: { initialSettings: AppSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ppnEnabled: initialSettings.ppnEnabled,
    ppnPercent: String(initialSettings.ppnPercent),
    pphEnabled: initialSettings.pphEnabled,
    pphPercent: String(initialSettings.pphPercent),
    pphBase: initialSettings.pphBase,
    reportCompanyName: initialSettings.reportCompanyName,
    reportNpwp: initialSettings.reportNpwp,
    reportAddress: initialSettings.reportAddress,
    reportFooterNote: initialSettings.reportFooterNote,
    openingCashIdr: String(initialSettings.openingCashIdr)
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch('/api/panel/pengaturan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ppnEnabled: form.ppnEnabled,
          ppnPercent: Number(form.ppnPercent || 0),
          pphEnabled: form.pphEnabled,
          pphPercent: Number(form.pphPercent || 0),
          pphBase: form.pphBase,
          reportCompanyName: form.reportCompanyName,
          reportNpwp: form.reportNpwp,
          reportAddress: form.reportAddress,
          reportFooterNote: form.reportFooterNote,
          openingCashIdr: Number(form.openingCashIdr || 0)
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Pajak</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            PPN dikenakan saat order servis dibuat dan tarifnya disalin ke order tersebut — mengubah tarif di sini tidak
            mengubah order yang sudah terlanjur dibuat.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={form.ppnEnabled}
            onChange={(e) => setForm({ ...form, ppnEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Kenakan PPN pada order servis
        </label>
        <label className="block text-xs text-slate-500 dark:text-slate-400">
          Tarif PPN (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            className="input input-inline mt-1 w-32"
            value={form.ppnPercent}
            onChange={(e) => setForm({ ...form, ppnPercent: e.target.value })}
          />
        </label>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.pphEnabled}
              onChange={(e) => setForm({ ...form, pphEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Hitung PPh di laporan laba rugi
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-500 dark:text-slate-400">
              Tarif PPh (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                className="input mt-1"
                value={form.pphPercent}
                onChange={(e) => setForm({ ...form, pphPercent: e.target.value })}
              />
            </label>
            <label className="block text-xs text-slate-500 dark:text-slate-400">
              Dasar pengenaan
              <select
                className="input mt-1"
                value={form.pphBase}
                onChange={(e) => setForm({ ...form, pphBase: e.target.value as PphBase })}
              >
                {PPH_BASES.map((base) => (
                  <option key={base} value={base}>
                    {PPH_BASE_LABEL[base]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Identitas kop laporan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dipakai di seluruh laporan dan dokumen cetak (kwitansi, invoice, SPK, slip gaji).
          </p>
        </div>

        <input
          className="input"
          required
          placeholder="Nama badan usaha *"
          value={form.reportCompanyName}
          onChange={(e) => setForm({ ...form, reportCompanyName: e.target.value })}
          aria-label="Nama badan usaha"
        />
        <input
          className="input"
          placeholder="NPWP"
          value={form.reportNpwp}
          onChange={(e) => setForm({ ...form, reportNpwp: e.target.value })}
          aria-label="NPWP"
        />
        <textarea
          className="input min-h-[70px]"
          placeholder="Alamat lengkap"
          value={form.reportAddress}
          onChange={(e) => setForm({ ...form, reportAddress: e.target.value })}
          aria-label="Alamat"
        />
        <textarea
          className="input min-h-[60px]"
          placeholder="Catatan kaki laporan"
          value={form.reportFooterNote}
          onChange={(e) => setForm({ ...form, reportFooterNote: e.target.value })}
          aria-label="Catatan kaki laporan"
        />
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold text-slate-900 dark:text-white">Saldo kas awal</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Saldo kas sebelum sistem ini dipakai. Angka ini jadi saldo pembuka di buku kas dan laporan arus kas, supaya
            saldo akhirnya cocok dengan uang fisik. Saat ini {formatIdr(initialSettings.openingCashIdr)}.
          </p>
        </div>
        <input
          type="number"
          min={0}
          step={100000}
          className="input"
          value={form.openingCashIdr}
          onChange={(e) => setForm({ ...form, openingCashIdr: e.target.value })}
          aria-label="Saldo kas awal"
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Pengaturan tersimpan.</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
      </button>
    </form>
  );
}
