import { COMPANY } from '@/lib/company';
import type { AppSettings } from '@/lib/settings';

/**
 * Model dokumen laporan yang netral format.
 *
 * Satu laporan dibangun sekali sebagai struktur ini, lalu dirender ke tiga
 * keluaran: HTML untuk layar, Word (.doc), dan PDF. Dengan begitu angka dan
 * susunan barisnya dijamin sama persis di ketiganya — tidak ada risiko laporan
 * layar dan laporan cetak berbeda isi.
 */
export type ReportColumn = {
  label: string;
  align?: 'left' | 'right' | 'center';
  /** Lebar relatif untuk PDF; di HTML dipakai sebagai persentase. */
  width?: number;
};

export type ReportCell = string | number;

export type ReportSection =
  | { kind: 'table'; title?: string; columns: ReportColumn[]; rows: ReportCell[][]; totals?: ReportCell[] }
  | { kind: 'summary'; title?: string; items: { label: string; value: string; emphasis?: boolean }[] }
  | { kind: 'note'; text: string };

export type ReportDocument = {
  /** Judul yang dicetak di bilah gelap, mis. "LAPORAN LABA RUGI". */
  title: string;
  /** Baris kecil di bawah judul, biasanya periode laporan. */
  subtitle?: string;
  sections: ReportSection[];
  settings: AppSettings;
  generatedAt: Date;
};

export const BRAND = {
  gold: '#F2B705',
  blue: '#1B4FD8',
  red: '#E0202B',
  dark: '#0F172A',
  grey: '#F1F5F9',
  muted: '#64748B'
} as const;

export function formatIdrPlain(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('id-ID');
  return amount < 0 ? `(${formatted})` : formatted;
}

export function formatDateId(value: Date): string {
  return value.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function periodLabel(from: Date, to: Date): string {
  return `Periode ${formatDateId(from)} s/d ${formatDateId(to)}`;
}

function escapeHtml(value: ReportCell): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Kop surat versi HTML — lambang digambar sebagai SVG inline, bukan gambar
 * eksternal, supaya berkas Word yang diunduh tetap berkop meski dibuka di
 * komputer tanpa koneksi internet.
 */
function letterheadHtml(settings: AppSettings): string {
  return `
  <table class="kop" width="100%">
    <tr>
      <td width="86" valign="middle">
        <svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" stroke-linecap="round">
            <path d="M84 38 A 35 35 0 1 0 63 79" stroke="${BRAND.gold}" stroke-width="12"/>
            <path d="M74 33 A 24 24 0 1 0 57 70" stroke="${BRAND.blue}" stroke-width="10"/>
            <path d="M65 30 A 15 15 0 1 0 52 62" stroke="${BRAND.red}" stroke-width="8"/>
          </g>
          <g fill="${BRAND.gold}">
            <path d="M40 60 C 52 72, 68 78, 92 74 C 74 84, 52 84, 38 72 Z"/>
            <path d="M46 72 C 56 80, 68 83, 84 82 C 70 89, 54 88, 44 80 Z"/>
            <path d="M33 54 C 39 60, 42 66, 41 73 C 35 68, 31 62, 31 55 Z"/>
          </g>
        </svg>
      </td>
      <td valign="middle">
        <div class="kop-nama">${escapeHtml(settings.reportCompanyName || COMPANY.legalName)}</div>
        <div class="kop-usaha">KAROSERI &middot; BODY REPAIR &middot; SERVICE MOBIL</div>
        <div class="kop-alamat">${escapeHtml(settings.reportAddress)}</div>
        <div class="kop-alamat">WhatsApp ${escapeHtml(COMPANY.phone)}${
          settings.reportNpwp ? ` &middot; NPWP ${escapeHtml(settings.reportNpwp)}` : ''
        }</div>
      </td>
    </tr>
  </table>
  <div class="kop-garis"></div>`;
}

function sectionHtml(section: ReportSection): string {
  if (section.kind === 'note') {
    return `<p class="catatan">${escapeHtml(section.text)}</p>`;
  }

  if (section.kind === 'summary') {
    const rows = section.items
      .map(
        (item) => `<tr class="${item.emphasis ? 'tegas' : ''}">
          <td>${escapeHtml(item.label)}</td>
          <td class="angka">${escapeHtml(item.value)}</td>
        </tr>`
      )
      .join('');
    return `${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
      <table class="data" width="100%"><tbody>${rows}</tbody></table>`;
  }

  const head = section.columns
    .map(
      (col) =>
        `<th class="${col.align ?? 'left'}"${col.width ? ` width="${col.width}%"` : ''}>${escapeHtml(col.label)}</th>`
    )
    .join('');

  const body = section.rows.length
    ? section.rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, i) => `<td class="${section.columns[i]?.align ?? 'left'}">${escapeHtml(cell)}</td>`)
              .join('')}</tr>`
        )
        .join('')
    : `<tr><td class="kosong" colspan="${section.columns.length}">Tidak ada data pada periode ini.</td></tr>`;

  const totals = section.totals
    ? `<tfoot><tr>${section.totals
        .map((cell, i) => `<td class="${section.columns[i]?.align ?? 'left'}">${escapeHtml(cell)}</td>`)
        .join('')}</tr></tfoot>`
    : '';

  return `${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
    <table class="data" width="100%">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
      ${totals}
    </table>`;
}

/**
 * Render ke HTML. Dipakai untuk pratinjau di layar sekaligus sebagai isi berkas
 * Word — Word membaca HTML bertipe `application/msword` sebagai dokumen penuh
 * lengkap dengan tabel dan warnanya.
 */
export function renderReportHtml(doc: ReportDocument): string {
  const body = doc.sections.map(sectionHtml).join('\n');

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4; margin: 1.6cm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11pt; }
  .kop { border-collapse: collapse; margin-bottom: 4px; }
  .kop td { padding: 0; }
  .kop-nama { font-size: 16pt; font-weight: bold; color: ${BRAND.dark}; }
  .kop-usaha { font-size: 8pt; font-weight: bold; color: ${BRAND.blue}; letter-spacing: 1px; }
  .kop-alamat { font-size: 8pt; color: ${BRAND.muted}; }
  .kop-garis { height: 4px; background: ${BRAND.gold}; margin: 6px 0 14px; }
  .judul { background: ${BRAND.dark}; color: #fff; text-align: center; padding: 8px; font-size: 13pt; font-weight: bold; }
  .periode { text-align: center; font-size: 9pt; color: ${BRAND.muted}; margin: 6px 0 16px; }
  h2 { font-size: 10pt; color: ${BRAND.blue}; margin: 16px 0 6px; text-transform: uppercase; }
  table.data { border-collapse: collapse; margin-bottom: 10px; }
  table.data th { background: ${BRAND.blue}; color: #fff; font-size: 9pt; padding: 6px; border: 1px solid #94a3b8; }
  table.data td { font-size: 9.5pt; padding: 5px 6px; border: 1px solid #cbd5e1; }
  table.data tfoot td { background: ${BRAND.grey}; font-weight: bold; }
  tr.tegas td { background: ${BRAND.grey}; font-weight: bold; font-size: 11pt; }
  .right, .angka { text-align: right; }
  .center { text-align: center; }
  .kosong { text-align: center; color: ${BRAND.muted}; font-style: italic; }
  .catatan { font-size: 8pt; color: ${BRAND.muted}; font-style: italic; margin-top: 4px; }
  .footer { margin-top: 22px; border-top: 2px solid ${BRAND.gold}; padding-top: 6px; font-size: 8pt; color: ${BRAND.muted}; }
  .ttd { margin-top: 34px; width: 100%; }
  .ttd td { font-size: 9pt; text-align: center; padding-top: 4px; }
</style></head>
<body>
  ${letterheadHtml(doc.settings)}
  <div class="judul">${escapeHtml(doc.title)}</div>
  ${doc.subtitle ? `<div class="periode">${escapeHtml(doc.subtitle)}</div>` : ''}
  ${body}
  <table class="ttd">
    <tr><td>Dibuat oleh,</td><td>Diperiksa oleh,</td><td>Disetujui oleh,</td></tr>
    <tr><td style="height:56px"></td><td></td><td></td></tr>
    <tr><td>(________________)</td><td>(________________)</td><td>(________________)</td></tr>
  </table>
  <div class="footer">
    ${escapeHtml(doc.settings.reportFooterNote)} Dicetak ${escapeHtml(
      doc.generatedAt.toLocaleString('id-ID')
    )}.
  </div>
</body></html>`;
}

/** Nama berkas unduhan yang aman dipakai di semua sistem operasi. */
export function reportFileName(title: string, ext: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slug}-${stamp}.${ext}`;
}
