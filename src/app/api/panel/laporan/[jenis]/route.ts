import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/api-handler';
import { periodFromParams } from '@/lib/data/reports';
import { buildReport, isReportType, REPORT_META } from '@/lib/reports/builders';
import { renderReportHtml, reportFileName } from '@/lib/reports/document';
import { renderReportPdf } from '@/lib/reports/pdf';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Unduh laporan sebagai Word atau PDF.
 *
 * `?format=doc` menghasilkan berkas HTML bertipe MIME Word. Word, WPS, maupun
 * Google Docs membukanya sebagai dokumen penuh lengkap dengan kop, tabel, dan
 * warnanya — dan berkasnya jauh lebih ringan daripada memaketkan pustaka .docx
 * ke dalam Worker. `?format=pdf` menghasilkan PDF asli lewat pdf-lib.
 */
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ jenis: string }> }) => {
  // Pemilik (bos) dan keuangan boleh mengunduh; produksi tidak melihat keuangan.
  const guard = await requireRole('keuangan', 'bos');
  if ('error' in guard) return guard.error;

  const { jenis } = await params;
  if (!isReportType(jenis)) {
    return NextResponse.json({ error: 'Jenis laporan tidak dikenal.' }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'doc';
  const period = periodFromParams(
    url.searchParams.get('from') ?? undefined,
    url.searchParams.get('to') ?? undefined
  );

  const doc = await buildReport(jenis, period);
  await logAction(guard.user.id, 'report.download', 'report', jenis, { format });

  if (format === 'pdf') {
    const bytes = await renderReportPdf(doc);
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportFileName(REPORT_META[jenis].menu, 'pdf')}"`,
        'Cache-Control': 'no-store'
      }
    });
  }

  return new NextResponse(renderReportHtml(doc), {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="${reportFileName(REPORT_META[jenis].menu, 'doc')}"`,
      'Cache-Control': 'no-store'
    }
  });
});
