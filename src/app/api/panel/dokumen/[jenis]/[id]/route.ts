import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/api-handler';
import {
  buildTransactionDoc,
  DocumentNotFound,
  isTransactionDocType,
  TRANSACTION_DOC_META
} from '@/lib/reports/transaction-docs';
import { renderReportHtml, reportFileName } from '@/lib/reports/document';
import { renderReportPdf } from '@/lib/reports/pdf';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Cetak dokumen per transaksi (SPK, estimasi, slip & bukti pembayaran, kartu
 * kontrol servis, surat hutang) sebagai Word atau PDF.
 *
 * Berbeda dengan laporan keuangan, dokumen ini juga dibutuhkan bagian produksi —
 * SPK dan kartu servis adalah lembar kerja harian mereka — jadi perannya
 * disertakan. Peran `bos` sengaja tidak diberi akses cetak dokumen operasional.
 */
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ jenis: string; id: string }> }) => {
    const { jenis, id } = await params;
    if (!isTransactionDocType(jenis)) {
      return NextResponse.json({ error: 'Jenis dokumen tidak dikenal.' }, { status: 404 });
    }

    // Dokumen kepegawaian memuat gaji perorangan, jadi aksesnya lebih sempit
    // daripada lembar kerja produksi seperti SPK dan kartu servis.
    const personnelDoc = jenis === 'slip-gaji' || jenis === 'kontrak-kerja';
    const guard = personnelDoc
      ? await requireRole('keuangan')
      : await requireRole('produksi', 'keuangan');
    if ('error' in guard) return guard.error;

    const format = new URL(req.url).searchParams.get('format') === 'pdf' ? 'pdf' : 'doc';

    let doc;
    try {
      doc = await buildTransactionDoc(jenis, id);
    } catch (err) {
      if (err instanceof DocumentNotFound) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      throw err;
    }

    await logAction(guard.user.id, 'document.print', 'document', `${jenis}:${id}`, { format });
    const fileName = reportFileName(TRANSACTION_DOC_META[jenis].menu, format);

    if (format === 'pdf') {
      const bytes = await renderReportPdf(doc);
      return new NextResponse(bytes as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    return new NextResponse(renderReportHtml(doc), {
      headers: {
        'Content-Type': 'application/msword; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store'
      }
    });
  }
);
