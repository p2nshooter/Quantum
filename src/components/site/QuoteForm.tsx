'use client';

import { useState } from 'react';
import { UNIT_TYPES, UNIT_TYPE_LABEL, type UnitType } from '@/lib/karoseri/constants';
import { COMPANY, whatsappLink } from '@/lib/company';

type FormState = {
  name: string;
  company: string;
  phone: string;
  email: string;
  unitType: UnitType;
  quantity: number;
  message: string;
};

const EMPTY: FormState = {
  name: '',
  company: '',
  phone: '',
  email: '',
  unitType: 'bus_besar',
  quantity: 1,
  message: ''
};

export function QuoteForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          company: form.company || null,
          phone: form.phone,
          email: form.email || null,
          unitType: form.unitType,
          quantity: Number(form.quantity) || 1,
          message: form.message || null
        })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim permintaan.');
      setStatus('sent');
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim permintaan.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div className="card text-center">
        <p className="text-3xl">✅</p>
        <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Permintaan Anda terkirim</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tim kami akan menghubungi Anda pada jam kerja{COMPANY.workingHours ? ` (${COMPANY.workingHours})` : ''}. Butuh
          lebih cepat? Hubungi kami langsung lewat WhatsApp.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <a
            href={whatsappLink('Halo, saya baru mengirim permintaan penawaran lewat website.')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent"
          >
            Chat WhatsApp
          </a>
          <button onClick={() => setStatus('idle')} className="btn-secondary">
            Kirim permintaan lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="quote-name">
            Nama <span className="text-red-500">*</span>
          </label>
          <input
            id="quote-name"
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama lengkap"
          />
        </div>
        <div>
          <label className="label" htmlFor="quote-company">
            Perusahaan / PO
          </label>
          <input
            id="quote-company"
            className="input"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Opsional"
          />
        </div>
        <div>
          <label className="label" htmlFor="quote-phone">
            WhatsApp / Telepon <span className="text-red-500">*</span>
          </label>
          <input
            id="quote-phone"
            className="input"
            required
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
        </div>
        <div>
          <label className="label" htmlFor="quote-email">
            Email
          </label>
          <input
            id="quote-email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Opsional"
          />
        </div>
        <div>
          <label className="label" htmlFor="quote-unit">
            Jenis unit <span className="text-red-500">*</span>
          </label>
          <select
            id="quote-unit"
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
          <label className="label" htmlFor="quote-qty">
            Jumlah unit
          </label>
          <input
            id="quote-qty"
            type="number"
            min={1}
            max={500}
            className="input"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="quote-message">
          Kebutuhan Anda
        </label>
        <textarea
          id="quote-message"
          className="input min-h-[110px]"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Contoh: chassis Hino RK8, bodi high deck 59 seat, target selesai Desember."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status === 'sending'} className="btn-primary">
          {status === 'sending' ? 'Mengirim…' : 'Kirim permintaan penawaran'}
        </button>
        <a
          href={whatsappLink('Halo, saya ingin bertanya soal layanan Bengkel Quantum.')}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          Tanya via WhatsApp
        </a>
      </div>
      <p className="text-xs text-slate-400">
        Data yang Anda kirim hanya dipakai tim {COMPANY.shortName} untuk menyiapkan penawaran.
      </p>
    </form>
  );
}
