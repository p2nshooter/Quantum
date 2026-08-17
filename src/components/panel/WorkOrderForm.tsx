'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  UNIT_TYPES,
  UNIT_TYPE_LABEL,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABEL,
  stageTemplateFor,
  type Priority,
  type UnitType,
  type WorkOrderStatus
} from '@/lib/karoseri/constants';
import { formatIdr } from '@/lib/format';

type CustomerOption = { id: string; name: string; company: string | null };
type ModelOption = {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  basePriceIdr: number;
  estimatedDays: number;
};

export function WorkOrderForm({
  customers,
  models
}: {
  customers: CustomerOption[];
  models: ModelOption[];
}) {
  const router = useRouter();
  const [customerList, setCustomerList] = useState(customers);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(customers.length === 0);
  const [newCustomer, setNewCustomer] = useState({ name: '', company: '', phone: '' });

  const [form, setForm] = useState({
    customerId: customers[0]?.id ?? '',
    bodyModelId: '',
    unitType: 'bus_besar' as UnitType,
    chassisBrand: '',
    chassisType: '',
    chassisNumber: '',
    engineNumber: '',
    policeNumber: '',
    color: '',
    seatCount: '',
    specNotes: '',
    contractValueIdr: '',
    status: 'antrian' as WorkOrderStatus,
    priority: 'normal' as Priority,
    startDate: '',
    targetDate: ''
  });

  const stagePreview = useMemo(() => stageTemplateFor(form.unitType), [form.unitType]);

  /**
   * Memilih model bodi ikut mengisi tipe unit, perkiraan nilai kontrak, dan
   * target selesai — angka-angka itu tetap bisa diubah manual setelahnya.
   */
  function selectModel(modelId: string) {
    const model = models.find((m) => m.id === modelId);
    if (!model) {
      setForm((prev) => ({ ...prev, bodyModelId: '' }));
      return;
    }

    setForm((prev) => {
      const startDate = prev.startDate || new Date().toISOString().slice(0, 10);
      const target = new Date(`${startDate}T00:00:00Z`);
      target.setUTCDate(target.getUTCDate() + model.estimatedDays);
      return {
        ...prev,
        bodyModelId: model.id,
        unitType: model.unitType,
        contractValueIdr: prev.contractValueIdr || String(model.basePriceIdr),
        startDate,
        targetDate: prev.targetDate || target.toISOString().slice(0, 10)
      };
    });
  }

  async function createCustomer() {
    setError(null);
    if (newCustomer.name.trim().length < 2 || newCustomer.phone.trim().length < 6) {
      setError('Nama dan nomor telepon pelanggan baru wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/panel/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name,
          company: newCustomer.company || null,
          phone: newCustomer.phone
        })
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Gagal menambah pelanggan.');

      const created = { id: data.id, name: newCustomer.name, company: newCustomer.company || null };
      setCustomerList((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, customerId: created.id }));
      setNewCustomer({ name: '', company: '', phone: '' });
      setShowNewCustomer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah pelanggan.');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.customerId) {
      setError('Pilih pelanggan terlebih dahulu.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/panel/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: form.customerId,
          bodyModelId: form.bodyModelId || null,
          unitType: form.unitType,
          chassisBrand: form.chassisBrand,
          chassisType: form.chassisType || null,
          chassisNumber: form.chassisNumber,
          engineNumber: form.engineNumber || null,
          policeNumber: form.policeNumber || null,
          color: form.color || null,
          seatCount: form.seatCount ? Number(form.seatCount) : null,
          specNotes: form.specNotes || null,
          contractValueIdr: Number(form.contractValueIdr || 0),
          status: form.status,
          priority: form.priority,
          startDate: form.startDate || null,
          targetDate: form.targetDate || null
        })
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Gagal membuat SPK.');

      router.push(`/panel/spk/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat SPK.');
      setSaving(false);
    }
  }

  const contractValue = Number(form.contractValueIdr || 0);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div className="space-y-6">
        <section className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Pelanggan</h2>

          {customerList.length > 0 && (
            <div>
              <label className="label" htmlFor="customer">
                Pilih pelanggan
              </label>
              <select
                id="customer"
                className="input"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                {customerList.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company ? `${customer.company} — ${customer.name}` : customer.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showNewCustomer ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Pelanggan baru</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  className="input"
                  placeholder="Nama PIC *"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Perusahaan / PO"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Telepon *"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={createCustomer} className="btn-primary">
                  Simpan pelanggan
                </button>
                {customerList.length > 0 && (
                  <button type="button" onClick={() => setShowNewCustomer(false)} className="btn-secondary">
                    Batal
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowNewCustomer(true)} className="text-sm font-semibold text-quantum-600 hover:underline">
              + Pelanggan baru
            </button>
          )}
        </section>

        <section className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Unit &amp; chassis</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="model">
                Model bodi
              </label>
              <select id="model" className="input" value={form.bodyModelId} onChange={(e) => selectModel(e.target.value)}>
                <option value="">— Tanpa model (custom) —</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.code} — {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="unitType">
                Tipe unit <span className="text-red-500">*</span>
              </label>
              <select
                id="unitType"
                className="input"
                value={form.unitType}
                onChange={(e) => setForm({ ...form, unitType: e.target.value as UnitType })}
              >
                {UNIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {UNIT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="chassisBrand">
                Merek chassis <span className="text-red-500">*</span>
              </label>
              <input
                id="chassisBrand"
                className="input"
                required
                placeholder="Hino / Mercedes-Benz / Isuzu"
                value={form.chassisBrand}
                onChange={(e) => setForm({ ...form, chassisBrand: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="chassisType">
                Tipe chassis
              </label>
              <input
                id="chassisType"
                className="input"
                placeholder="RK8 R260 / OH 1626"
                value={form.chassisType}
                onChange={(e) => setForm({ ...form, chassisType: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="chassisNumber">
                Nomor rangka <span className="text-red-500">*</span>
              </label>
              <input
                id="chassisNumber"
                className="input font-mono"
                required
                value={form.chassisNumber}
                onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-400">Dipakai pelanggan untuk melacak progres unitnya.</p>
            </div>

            <div>
              <label className="label" htmlFor="engineNumber">
                Nomor mesin
              </label>
              <input
                id="engineNumber"
                className="input font-mono"
                value={form.engineNumber}
                onChange={(e) => setForm({ ...form, engineNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="policeNumber">
                Nomor polisi
              </label>
              <input
                id="policeNumber"
                className="input uppercase"
                value={form.policeNumber}
                onChange={(e) => setForm({ ...form, policeNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="color">
                Warna
              </label>
              <input
                id="color"
                className="input"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="seatCount">
                Jumlah kursi
              </label>
              <input
                id="seatCount"
                type="number"
                min={0}
                max={200}
                className="input"
                value={form.seatCount}
                onChange={(e) => setForm({ ...form, seatCount: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="specNotes">
              Spesifikasi &amp; catatan pengerjaan
            </label>
            <textarea
              id="specNotes"
              className="input min-h-[110px]"
              placeholder="Detail interior, AC, audio, striping, permintaan khusus pelanggan…"
              value={form.specNotes}
              onChange={(e) => setForm({ ...form, specNotes: e.target.value })}
            />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Kontrak &amp; jadwal</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contractValue">
                Nilai kontrak (Rp)
              </label>
              <input
                id="contractValue"
                type="number"
                min={0}
                step={1000}
                className="input"
                value={form.contractValueIdr}
                onChange={(e) => setForm({ ...form, contractValueIdr: e.target.value })}
              />
              {contractValue > 0 && <p className="mt-1 text-xs text-slate-400">{formatIdr(contractValue)}</p>}
            </div>

            <div>
              <label className="label" htmlFor="priority">
                Prioritas
              </label>
              <select
                id="priority"
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="startDate">
                Mulai dikerjakan
              </label>
              <input
                id="startDate"
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="targetDate">
                Target selesai
              </label>
              <input
                id="targetDate"
                type="date"
                className="input"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="status">
                Status awal
              </label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrderStatus })}
              >
                {WORK_ORDER_STATUSES.filter((s) => s !== 'batal').map((value) => (
                  <option key={value} value={value}>
                    {WORK_ORDER_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>

      <aside className="card lg:sticky lg:top-6">
        <h2 className="font-bold text-slate-900 dark:text-white">Tahapan yang akan dibuat</h2>
        <p className="mt-1 text-xs text-slate-400">
          Dibuat otomatis dari template {UNIT_TYPE_LABEL[form.unitType]} saat SPK disimpan.
        </p>
        <ol className="mt-4 space-y-2">
          {stagePreview.map((stage, index) => (
            <li key={stage.name} className="flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {index + 1}
              </span>
              <span className="flex-1 text-slate-600 dark:text-slate-300">{stage.name}</span>
              <span className="text-xs text-slate-400">{stage.weightPercent}%</span>
            </li>
          ))}
        </ol>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary mt-5 w-full">
          {saving ? 'Menyimpan…' : 'Simpan SPK'}
        </button>
      </aside>
    </form>
  );
}
