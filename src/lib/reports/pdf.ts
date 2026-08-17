import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { COMPANY } from '@/lib/company';
import {
  BRAND,
  formatIdrPlain,
  terbilang,
  type ReportCell,
  type ReportColumn,
  type ReportDocument
} from './document';

/**
 * Render laporan ke PDF asli memakai pdf-lib.
 *
 * pdf-lib berjalan penuh di Cloudflare Workers (tanpa Node API dan tanpa
 * peramban headless), jadi berkasnya dibuat langsung di server saat tombol
 * unduh ditekan.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

function hex(color: string) {
  const value = color.replace('#', '');
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

const COLORS = {
  gold: hex(BRAND.gold),
  blue: hex(BRAND.blue),
  red: hex(BRAND.red),
  dark: hex(BRAND.dark),
  grey: hex(BRAND.grey),
  muted: hex(BRAND.muted),
  line: hex('#CBD5E1'),
  white: rgb(1, 1, 1)
};

/**
 * Font PDF standar memakai encoding WinAnsi yang tidak mengenal karakter seperti
 * — atau ·, dan pdf-lib melempar error begitu menemukannya. Semua teks disaring
 * lewat sini supaya satu karakter nyasar tidak menggagalkan seluruh unduhan.
 */
function sanitize(text: string): string {
  return text
    .replace(/[—–]/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\x20-\xFF]/g, '');
}

type Ctx = {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  doc: ReportDocument;
  pageNumber: number;
};

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; maxWidth?: number } = {}
) {
  const size = opts.size ?? 9;
  const font = opts.bold ? ctx.bold : ctx.font;
  let value = sanitize(text);

  // Potong teks yang melebihi lebar kolom supaya tidak menabrak kolom sebelahnya.
  if (opts.maxWidth) {
    while (value.length > 1 && font.widthOfTextAtSize(value, size) > opts.maxWidth) {
      value = value.slice(0, -2) + '.';
    }
  }

  ctx.page.drawText(value, { x, y, size, font, color: opts.color ?? COLORS.dark });
}

/** Pecah teks panjang menjadi beberapa baris yang muat di lebar yang diberikan. */
function wrapText(ctx: Ctx, text: string, maxWidth: number, size: number): string[] {
  const words = sanitize(text).split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textWidth(ctx: Ctx, text: string, size: number, bold = false): number {
  return (bold ? ctx.bold : ctx.font).widthOfTextAtSize(sanitize(text), size);
}

/** Kop surat: lambang sederhana + identitas perusahaan + garis emas. */
function drawLetterhead(ctx: Ctx) {
  const top = A4.height - MARGIN;

  // Lambang: tiga busur bertumpuk, versi ringkas dari logo bengkel.
  const cx = MARGIN + 22;
  const cy = top - 24;
  ctx.page.drawCircle({ x: cx, y: cy, size: 22, borderColor: COLORS.gold, borderWidth: 7 });
  ctx.page.drawCircle({ x: cx, y: cy, size: 14, borderColor: COLORS.blue, borderWidth: 6 });
  ctx.page.drawCircle({ x: cx, y: cy, size: 7, borderColor: COLORS.red, borderWidth: 4 });

  const left = MARGIN + 56;
  drawText(ctx, ctx.doc.settings.reportCompanyName || COMPANY.legalName, left, top - 14, {
    size: 15,
    bold: true
  });
  drawText(ctx, 'KAROSERI - BODY REPAIR - SERVICE MOBIL', left, top - 27, {
    size: 7.5,
    bold: true,
    color: COLORS.blue
  });
  drawText(ctx, ctx.doc.settings.reportAddress, left, top - 38, { size: 7, color: COLORS.muted });
  const npwp = ctx.doc.settings.reportNpwp ? ` - NPWP ${ctx.doc.settings.reportNpwp}` : '';
  drawText(ctx, `WhatsApp ${COMPANY.phone}${npwp}`, left, top - 48, { size: 7, color: COLORS.muted });

  ctx.page.drawRectangle({ x: MARGIN, y: top - 58, width: CONTENT_WIDTH, height: 3, color: COLORS.gold });
  ctx.y = top - 76;
}

function drawTitle(ctx: Ctx) {
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 20, width: CONTENT_WIDTH, height: 22, color: COLORS.dark });
  const size = 12;
  const width = textWidth(ctx, ctx.doc.title, size, true);
  drawText(ctx, ctx.doc.title, MARGIN + (CONTENT_WIDTH - width) / 2, ctx.y - 14, {
    size,
    bold: true,
    color: COLORS.white
  });
  ctx.y -= 32;

  if (ctx.doc.subtitle) {
    const subSize = 8.5;
    const subWidth = textWidth(ctx, ctx.doc.subtitle, subSize);
    drawText(ctx, ctx.doc.subtitle, MARGIN + (CONTENT_WIDTH - subWidth) / 2, ctx.y, {
      size: subSize,
      color: COLORS.muted
    });
    ctx.y -= 16;
  }
  ctx.y -= 4;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.pdf.addPage([A4.width, A4.height]);
  ctx.pageNumber += 1;
  drawLetterhead(ctx);
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 60) newPage(ctx);
}

/** Bagi lebar kolom secara proporsional terhadap lebar area cetak. */
function columnWidths(columns: ReportColumn[]): number[] {
  const weights = columns.map((c) => c.width ?? 1);
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => (w / total) * CONTENT_WIDTH);
}

function drawRow(
  ctx: Ctx,
  cells: ReportCell[],
  columns: ReportColumn[],
  widths: number[],
  opts: { header?: boolean; footer?: boolean } = {}
) {
  const height = 16;
  ensureSpace(ctx, height);

  if (opts.header) {
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - height + 4, width: CONTENT_WIDTH, height, color: COLORS.blue });
  } else if (opts.footer) {
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - height + 4, width: CONTENT_WIDTH, height, color: COLORS.grey });
  }

  let x = MARGIN;
  cells.forEach((cell, index) => {
    const width = widths[index] ?? 0;
    const align = columns[index]?.align ?? 'left';
    const size = opts.header ? 7.5 : 8;
    const bold = Boolean(opts.header || opts.footer);
    const color = opts.header ? COLORS.white : COLORS.dark;
    const padded = width - 8;
    const value = String(cell);
    let tx = x + 4;
    if (align === 'right') tx = x + width - 4 - Math.min(textWidth(ctx, value, size, bold), padded);
    else if (align === 'center') tx = x + (width - Math.min(textWidth(ctx, value, size, bold), padded)) / 2;

    drawText(ctx, value, tx, ctx.y - height + 9, { size, bold, color, maxWidth: padded });
    x += width;
  });

  // Garis bawah tiap baris agar tabel terbaca seperti tabel cetak.
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y - height + 3 },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y - height + 3 },
    thickness: 0.5,
    color: COLORS.line
  });

  ctx.y -= height;
}

function drawFooters(ctx: Ctx, totalPages: number) {
  const pages = ctx.pdf.getPages();
  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: MARGIN, y: MARGIN + 26 },
      end: { x: MARGIN + CONTENT_WIDTH, y: MARGIN + 26 },
      thickness: 1.5,
      color: COLORS.gold
    });
    const note = sanitize(
      `${ctx.doc.settings.reportFooterNote} Dicetak ${ctx.doc.generatedAt.toLocaleString('id-ID')}.`
    );
    page.drawText(note, { x: MARGIN, y: MARGIN + 14, size: 6.5, font: ctx.font, color: COLORS.muted });
    const label = `Halaman ${index + 1} dari ${totalPages}`;
    page.drawText(label, {
      x: MARGIN + CONTENT_WIDTH - ctx.font.widthOfTextAtSize(label, 6.5),
      y: MARGIN + 14,
      size: 6.5,
      font: ctx.font,
      color: COLORS.muted
    });
  });
}

export async function renderReportPdf(doc: ReportDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(sanitize(doc.title));
  pdf.setProducer(sanitize(doc.settings.reportCompanyName));

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.width, A4.height]);

  const ctx: Ctx = { pdf, page, y: 0, font, bold, doc, pageNumber: 1 };
  drawLetterhead(ctx);
  drawTitle(ctx);

  for (const section of doc.sections) {
    if (section.kind === 'note') {
      // Catatan dibungkus per kata, bukan dipotong — kalimat metode perhitungan
      // justru bagian yang paling perlu terbaca utuh oleh pemeriksa laporan.
      for (const line of wrapText(ctx, section.text, CONTENT_WIDTH, 7)) {
        ensureSpace(ctx, 12);
        drawText(ctx, line, MARGIN, ctx.y - 8, { size: 7, color: COLORS.muted });
        ctx.y -= 10;
      }
      ctx.y -= 8;
      continue;
    }

    // Blok isian: dua kelompok bersebelahan, mengikuti formulir cetak.
    if (section.kind === 'fields') {
      const colWidth = CONTENT_WIDTH / section.groups.length;
      const startY = ctx.y;
      let lowest = startY;

      section.groups.forEach((group, gi) => {
        const x = MARGIN + colWidth * gi;
        let y = startY;

        if (group.title) {
          ctx.page.drawRectangle({ x, y: y - 12, width: colWidth - 10, height: 13, color: COLORS.gold });
          drawText(ctx, group.title.toUpperCase(), x + 5, y - 9, { size: 7.5, bold: true });
          y -= 20;
        }

        for (const item of group.items) {
          drawText(ctx, item.label, x + 2, y - 8, { size: 8, color: COLORS.muted, maxWidth: colWidth * 0.4 });
          drawText(ctx, ':', x + colWidth * 0.42, y - 8, { size: 8, color: COLORS.muted });
          drawText(ctx, item.value || '-', x + colWidth * 0.46, y - 8, {
            size: 8,
            maxWidth: colWidth * 0.5
          });
          y -= 13;
        }
        lowest = Math.min(lowest, y);
      });

      ctx.y = lowest - 8;
      continue;
    }

    if (section.kind === 'amount') {
      ensureSpace(ctx, 44);
      const boxHeight = 26;
      ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - boxHeight, width: 240, height: boxHeight, color: COLORS.dark });
      drawText(ctx, 'Rp', MARGIN + 12, ctx.y - 18, { size: 13, bold: true, color: COLORS.gold });
      drawText(ctx, formatIdrPlain(section.amountIdr), MARGIN + 40, ctx.y - 18, {
        size: 14,
        bold: true,
        color: COLORS.white
      });
      ctx.y -= boxHeight + 6;

      if (section.showTerbilang) {
        for (const line of wrapText(ctx, `Terbilang: ${terbilang(section.amountIdr)}`, CONTENT_WIDTH, 8)) {
          drawText(ctx, line, MARGIN, ctx.y - 8, { size: 8 });
          ctx.y -= 11;
        }
      }
      ctx.y -= 6;
      continue;
    }

    if (section.kind === 'choices') {
      ensureSpace(ctx, 18);
      drawText(ctx, `${section.label}:`, MARGIN, ctx.y - 8, { size: 8.5, bold: true });
      let x = MARGIN + textWidth(ctx, `${section.label}:`, 8.5, true) + 10;
      for (const option of section.options) {
        const mark = section.selected === option ? '[X]' : '[  ]';
        drawText(ctx, `${mark} ${option}`, x, ctx.y - 8, { size: 8.5 });
        x += textWidth(ctx, `${mark} ${option}`, 8.5) + 16;
      }
      ctx.y -= 20;
      continue;
    }

    if (section.kind === 'signatures') {
      ensureSpace(ctx, 76);
      ctx.y -= 10;
      const cell = CONTENT_WIDTH / section.items.length;
      section.items.forEach((item, index) => {
        const x = MARGIN + cell * index;
        // Label boleh bertingkat (mis. "Bekasi, 8 Juli 2026" lalu "Hormat kami,");
        // tanpa pemecahan ini keduanya tercetak menempel jadi satu baris.
        item.role.split('\n').forEach((line, lineIndex) => {
          const width = textWidth(ctx, line, 8);
          drawText(ctx, line, x + (cell - width) / 2, ctx.y - lineIndex * 11, { size: 8 });
        });
        const name = `(${item.name || '________________'})`;
        const nameWidth = textWidth(ctx, name, 8);
        drawText(ctx, name, x + (cell - nameWidth) / 2, ctx.y - 46, { size: 8 });
      });
      ctx.y -= 62;
      continue;
    }

    if (section.title) {
      ensureSpace(ctx, 22);
      drawText(ctx, section.title.toUpperCase(), MARGIN, ctx.y - 10, { size: 9, bold: true, color: COLORS.blue });
      ctx.y -= 20;
    }

    if (section.kind === 'summary') {
      const columns: ReportColumn[] = [
        { label: '', width: 3 },
        { label: '', align: 'right', width: 1 }
      ];
      const widths = columnWidths(columns);
      for (const item of section.items) {
        drawRow(ctx, [item.label, item.value], columns, widths, { footer: item.emphasis });
      }
      ctx.y -= 8;
      continue;
    }

    const widths = columnWidths(section.columns);
    drawRow(ctx, section.columns.map((c) => c.label), section.columns, widths, { header: true });

    if (section.rows.length === 0) {
      drawRow(ctx, [`Tidak ada data pada periode ini.`, ...section.columns.slice(1).map(() => '')], section.columns, widths);
    } else {
      for (const row of section.rows) drawRow(ctx, row, section.columns, widths);
    }

    if (section.totals) drawRow(ctx, section.totals, section.columns, widths, { footer: true });
    ctx.y -= 10;
  }

  // Blok tanda tangan baku dilewati bila dokumen sudah punya susunannya sendiri.
  if (doc.sections.some((s) => s.kind === 'signatures')) {
    drawFooters(ctx, pdf.getPageCount());
    return pdf.save();
  }

  ensureSpace(ctx, 80);
  ctx.y -= 16;
  const third = CONTENT_WIDTH / 3;
  ['Dibuat oleh,', 'Diperiksa oleh,', 'Disetujui oleh,'].forEach((label, index) => {
    const x = MARGIN + third * index;
    const width = textWidth(ctx, label, 8);
    drawText(ctx, label, x + (third - width) / 2, ctx.y, { size: 8 });
    const line = '(________________)';
    const lineWidth = textWidth(ctx, line, 8);
    drawText(ctx, line, x + (third - lineWidth) / 2, ctx.y - 46, { size: 8 });
  });

  drawFooters(ctx, pdf.getPageCount());
  return pdf.save();
}
