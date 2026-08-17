import type { ReportDocument, ReportSection } from './document';

/**
 * Bentuk dokumen laporan yang aman dilewatkan dari server component ke komponen
 * klien: hanya nilai biasa, tanpa Date atau objek setelan lengkap.
 *
 * Fungsinya sengaja tinggal di modul server (bukan di dalam berkas komponen
 * berlabel 'use client'), karena fungsi di berkas client tidak boleh dipanggil
 * dari server — Next.js menolaknya saat render.
 */
export type SerializedReport = {
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  companyName: string;
  companyAddress: string;
  footerNote: string;
  generatedAtLabel: string;
};

export function serializeReport(doc: ReportDocument): SerializedReport {
  return {
    title: doc.title,
    subtitle: doc.subtitle,
    sections: doc.sections,
    companyName: doc.settings.reportCompanyName,
    companyAddress: doc.settings.reportAddress,
    footerNote: doc.settings.reportFooterNote,
    generatedAtLabel: doc.generatedAt.toLocaleString('id-ID')
  };
}
