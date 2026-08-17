'use client';

import { useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDate } from '@/lib/format';
import { STAGE_STATUS_LABEL, type StageStatus } from '@/lib/karoseri/constants';

type TrackResult = {
  spkNumber: string;
  unitTypeLabel: string;
  chassis: string;
  statusLabel: string;
  customerName: string;
  startDate: string | null;
  targetDate: string | null;
  deliveredAt: string | null;
  progressPercent: number;
  stages: {
    name: string;
    status: StageStatus;
    sortOrder: number;
    startedAt: string | null;
    finishedAt: string | null;
  }[];
};

const DOT_TONE: Record<StageStatus, string> = {
  done: 'bg-emerald-500',
  in_progress: 'bg-quantum-600 ring-4 ring-quantum-100 dark:ring-quantum-950',
  blocked: 'bg-red-500',
  pending: 'bg-slate-300 dark:bg-slate-700'
};

export function TrackClient() {
  const [spkNumber, setSpkNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/lacak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spkNumber, chassisNumber })
      });
      const data = (await res.json()) as TrackResult & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Data tidak ditemukan.');
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Data tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="spk">
              Nomor SPK
            </label>
            <input
              id="spk"
              className="input"
              required
              value={spkNumber}
              onChange={(e) => setSpkNumber(e.target.value)}
              placeholder="SPK/202608/001"
            />
          </div>
          <div>
            <label className="label" htmlFor="chassis">
              Nomor rangka
            </label>
            <input
              id="chassis"
              className="input"
              required
              value={chassisNumber}
              onChange={(e) => setChassisNumber(e.target.value)}
              placeholder="Sesuai surat perjanjian"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Mencari…' : 'Lihat progres'}
        </button>
        <p className="text-xs text-slate-400">
          Nomor rangka diminta sebagai verifikasi agar progres unit Anda tidak bisa dilihat orang lain.
        </p>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm text-slate-400">{result.spkNumber}</p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{result.unitTypeLabel}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {result.chassis} · {result.customerName}
                </p>
              </div>
              <span className="rounded-full bg-quantum-100 px-3 py-1 text-sm font-semibold text-quantum-700 dark:bg-quantum-950 dark:text-quantum-300">
                {result.statusLabel}
              </span>
            </div>

            <div className="mt-5">
              <ProgressBar percent={result.progressPercent} />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3 dark:border-slate-800">
              <div>
                <dt className="text-xs text-slate-400">Mulai dikerjakan</dt>
                <dd className="font-semibold">{formatDate(result.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Target selesai</dt>
                <dd className="font-semibold">{formatDate(result.targetDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Serah terima</dt>
                <dd className="font-semibold">{formatDate(result.deliveredAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h3 className="mb-4 font-bold text-slate-900 dark:text-white">Tahapan pengerjaan</h3>
            <ol className="space-y-4">
              {result.stages.map((stage) => (
                <li key={stage.sortOrder} className="flex gap-3">
                  <span className="relative flex flex-col items-center">
                    <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${DOT_TONE[stage.status]}`} />
                    <span className="mt-1 w-px flex-1 bg-slate-200 last:hidden dark:bg-slate-800" />
                  </span>
                  <div className="flex-1 pb-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          stage.status === 'pending'
                            ? 'text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {stage.name}
                      </p>
                      <span className="text-xs text-slate-400">{STAGE_STATUS_LABEL[stage.status]}</span>
                    </div>
                    {(stage.startedAt || stage.finishedAt) && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {stage.startedAt && `Mulai ${formatDate(stage.startedAt)}`}
                        {stage.startedAt && stage.finishedAt && ' · '}
                        {stage.finishedAt && `Selesai ${formatDate(stage.finishedAt)}`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
