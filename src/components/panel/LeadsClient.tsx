'use client';

import { useState } from 'react';
import { LeadBadge } from '@/components/ui/Badge';
import { formatDateTime, type DateLike } from '@/lib/format';
import { LEAD_STATUSES, LEAD_STATUS_LABEL, UNIT_TYPE_LABEL, type LeadStatus, type UnitType } from '@/lib/karoseri/constants';

type Lead = {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  unitType: UnitType;
  quantity: number;
  message: string | null;
  status: LeadStatus;
  internalNotes: string | null;
  createdAt: DateLike;
};

export function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function patch(id: string, payload: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/panel/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui data.');
      setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...payload } : lead)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui data.');
    }
  }

  if (leads.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-400">
        Belum ada permintaan penawaran masuk. Form di halaman publik akan mengisi daftar ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {leads.map((lead) => (
        <article key={lead.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {lead.company ? `${lead.company} — ${lead.name}` : lead.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {lead.phone}
                {lead.email ? ` · ${lead.email}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {UNIT_TYPE_LABEL[lead.unitType]} · {lead.quantity} unit · masuk {formatDateTime(lead.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <LeadBadge status={lead.status} />
              <select
                className="input input-inline h-9 py-1 text-xs"
                value={lead.status}
                onChange={(e) => patch(lead.id, { status: e.target.value as LeadStatus })}
                aria-label={`Status permintaan dari ${lead.name}`}
              >
                {LEAD_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {LEAD_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
              <a
                href={`https://wa.me/${lead.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary h-9 px-3 py-1 text-xs"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {lead.message && (
            <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              {lead.message}
            </p>
          )}

          <div className="mt-3">
            <label className="label text-xs">Catatan internal</label>
            <div className="flex flex-wrap gap-2">
              <input
                className="input flex-1"
                placeholder="Tindak lanjut, harga yang ditawarkan, dsb."
                value={notesDraft[lead.id] ?? lead.internalNotes ?? ''}
                onChange={(e) => setNotesDraft({ ...notesDraft, [lead.id]: e.target.value })}
              />
              <button
                onClick={() => patch(lead.id, { internalNotes: notesDraft[lead.id] ?? lead.internalNotes ?? '' })}
                className="btn-secondary"
              >
                Simpan
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
