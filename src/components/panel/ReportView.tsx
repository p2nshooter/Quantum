'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatIdrPlain as formatAmount, terbilang as terbilangText, type ReportSection } from '@/lib/reports/document';
import type { SerializedReport } from '@/lib/reports/serialize';

/**
 * Tampilan laporan di layar. Membaca struktur dokumen yang sama dengan yang
 * dipakai berkas Word dan PDF, jadi apa yang dilihat di layar persis sama
 * dengan yang tercetak.
 */
export function ReportView({
  doc,
  jenis,
  from,
  to
}: {
  doc: SerializedReport;
  jenis: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);

  function applyPeriod(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    next.set('from', fromValue);
    next.set('to', toValue);
    router.push(`?${next.toString()}`);
  }

  const downloadUrl = (format: 'doc' | 'pdf') =>
    `/api/panel/laporan/${jenis}?format=${format}&from=${fromValue}&to=${toValue}`;

  return (
    <div className="space-y-5">
      <form onSubmit={applyPeriod} className="card no-print flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs" htmlFor="from">
            Dari tanggal
          </label>
          <input
            id="from"
            type="date"
            className="input"
            value={fromValue}
            onChange={(e) => setFromValue(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs" htmlFor="to">
            Sampai tanggal
          </label>
          <input id="to" type="date" className="input" value={toValue} onChange={(e) => setToValue(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">
          Tampilkan
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          {/* Unduhan memakai <a download> biasa supaya berkas langsung tersimpan
              tanpa membuka tab baru. */}
          <a href={downloadUrl('pdf')} download className="btn-secondary">
            ⬇ Unduh PDF
          </a>
          <a href={downloadUrl('doc')} download className="btn-accent">
            ⬇ Unduh Word
          </a>
          <button type="button" onClick={() => window.print()} className="btn-secondary">
            🖨 Cetak
          </button>
        </div>
      </form>

      <div className="card">
        <ReportLetterhead doc={doc} />
        <div className="mt-4 bg-slate-900 py-2 text-center text-sm font-black tracking-wide text-white">
          {doc.title}
        </div>
        {doc.subtitle && <p className="mt-2 text-center text-xs text-slate-500">{doc.subtitle}</p>}

        <div className="mt-5 space-y-6">
          {doc.sections.map((section, index) => (
            <SectionView key={index} section={section} />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center text-xs text-slate-500">
          {['Dibuat oleh,', 'Diperiksa oleh,', 'Disetujui oleh,'].map((label) => (
            <div key={label}>
              <p>{label}</p>
              <p className="mt-12">(________________)</p>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t-2 border-gold-500 pt-2 text-[10px] text-slate-400">
          {doc.footerNote} Dicetak {doc.generatedAtLabel}.
        </p>
      </div>
    </div>
  );
}

function ReportLetterhead({ doc }: { doc: SerializedReport }) {
  return (
    <div className="flex items-center gap-3 border-b-4 border-gold-500 pb-3">
      <svg width="56" height="56" viewBox="0 0 100 100" aria-hidden="true">
        <g fill="none" strokeLinecap="round">
          <path d="M84 38 A 35 35 0 1 0 63 79" stroke="#F2B705" strokeWidth="12" />
          <path d="M74 33 A 24 24 0 1 0 57 70" stroke="#1B4FD8" strokeWidth="10" />
          <path d="M65 30 A 15 15 0 1 0 52 62" stroke="#E0202B" strokeWidth="8" />
        </g>
        <g fill="#F2B705">
          <path d="M40 60 C 52 72, 68 78, 92 74 C 74 84, 52 84, 38 72 Z" />
          <path d="M46 72 C 56 80, 68 83, 84 82 C 70 89, 54 88, 44 80 Z" />
          <path d="M33 54 C 39 60, 42 66, 41 73 C 35 68, 31 62, 31 55 Z" />
        </g>
      </svg>
      <div>
        <p className="text-lg font-black leading-tight text-slate-900 dark:text-white">{doc.companyName}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-quantum-600">
          Karoseri · Body Repair · Service Mobil
        </p>
        <p className="text-[10px] text-slate-500">{doc.companyAddress}</p>
      </div>
    </div>
  );
}

function SectionView({ section }: { section: ReportSection }) {
  if (section.kind === 'note') {
    return <p className="text-xs italic text-slate-500">{section.text}</p>;
  }

  if (section.kind === 'fields') {
    return (
      <div className={`grid gap-5 ${section.groups.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {section.groups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <div className="mb-2 bg-gold-500 px-2 py-1 text-xs font-bold uppercase text-slate-900">
                {group.title}
              </div>
            )}
            <dl className="space-y-1 text-sm">
              {group.items.map((item) => (
                <div key={item.label} className="flex gap-2">
                  <dt className="w-36 shrink-0 text-slate-500">{item.label}</dt>
                  <dd className="flex-1 border-b border-dotted border-slate-300 text-slate-800 dark:border-slate-600 dark:text-slate-100">
                    {item.value || '-'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'amount') {
    return (
      <div>
        <div className="inline-flex items-baseline gap-3 rounded-lg bg-slate-900 px-5 py-2.5">
          <span className="text-lg font-black text-gold-400">Rp</span>
          <span className="text-2xl font-black tabular-nums text-white">{formatAmount(section.amountIdr)}</span>
        </div>
        {section.showTerbilang && (
          <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">
            Terbilang: {terbilangText(section.amountIdr)}
          </p>
        )}
      </div>
    );
  }

  if (section.kind === 'choices') {
    return (
      <p className="text-sm">
        <strong>{section.label}:</strong>{' '}
        {section.options.map((option) => (
          <span key={option} className="mr-5">
            {section.selected === option ? '☒' : '☐'} {option}
          </span>
        ))}
      </p>
    );
  }

  if (section.kind === 'signatures') {
    return (
      <div className={`grid gap-4 text-center text-xs text-slate-500 grid-cols-${Math.min(section.items.length, 4)}`}>
        {section.items.map((item) => (
          <div key={item.role}>
            <p>{item.role}</p>
            <p className="mt-12">({item.name || '________________'})</p>
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === 'summary') {
    return (
      <div>
        {section.title && <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-quantum-600">{section.title}</h2>}
        <table className="table-base">
          <tbody>
            {section.items.map((item) => (
              <tr key={item.label} className={item.emphasis ? 'bg-slate-100 font-bold dark:bg-slate-800' : ''}>
                <td>{item.label}</td>
                <td className="text-right tabular-nums">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {section.title && <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-quantum-600">{section.title}</h2>}
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              {section.columns.map((col, i) => (
                <th key={i} className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.length === 0 ? (
              <tr>
                <td colSpan={section.columns.length} className="py-6 text-center italic text-slate-400">
                  Tidak ada data pada periode ini.
                </td>
              </tr>
            ) : (
              section.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={
                        section.columns[j]?.align === 'right'
                          ? 'text-right tabular-nums'
                          : section.columns[j]?.align === 'center'
                            ? 'text-center'
                            : ''
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {section.totals && (
            <tfoot>
              <tr className="bg-slate-100 font-bold dark:bg-slate-800">
                {section.totals.map((cell, i) => (
                  <td
                    key={i}
                    className={section.columns[i]?.align === 'right' ? 'text-right tabular-nums' : ''}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
