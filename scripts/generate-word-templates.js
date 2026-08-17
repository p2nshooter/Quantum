/**
 * Membuat template Word berkop surat CV. Quantum Karya Bersama.
 *
 * Menghasilkan tiga berkas di `templates/`:
 *   1. Kop-Surat-Quantum.docx   — kertas surat kosong berkop, untuk surat apa pun
 *   2. Kwitansi-Quantum.docx    — nota/kwitansi pembayaran
 *   3. Invoice-Servis-Quantum.docx — invoice servis kendaraan
 *
 * Jalankan: node scripts/generate-word-templates.js
 * (butuh paket `docx`: npm install --no-save docx)
 */
const fs = require('fs');
const path = require('path');
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} = require('docx');

const ROOT = path.resolve(__dirname, '..');
const LOGO = path.join(ROOT, 'assets', 'logo-quantum.png');
const OUT_DIR = path.join(ROOT, 'templates');

/* Warna identitas dari papan nama bengkel. */
const GOLD = 'F2B705';
const BLUE = '1B4FD8';
const RED = 'E0202B';
const DARK = '0F172A';
const GREY = 'F1F5F9';

const COMPANY = 'CV. QUANTUM KARYA BERSAMA';
const BUSINESS = 'KAROSERI  ·  BODY REPAIR  ·  SERVICE MOBIL';
const ADDRESS = 'Kp. Tenjo Laut No. 1 RT 01/01, Desa Sukakarya, Kec. Sukakarya, Kabupaten Bekasi';
const PHONE = 'WhatsApp 0858-8669-2214';

const FONT = 'Arial';
/** Lebar area cetak A4 dengan margin 1 inci, dalam DXA. */
const PAGE_WIDTH = 9360;

const logoBuffer = fs.existsSync(LOGO) ? fs.readFileSync(LOGO) : null;

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none };
}

/**
 * Kop surat: lambang di kiri, identitas perusahaan di kanan, lalu garis emas.
 * Dibuat sebagai tabel tanpa garis supaya sejajar rapi di Word maupun Google Docs.
 */
function letterhead() {
  const logoCell = new TableCell({
    width: { size: 1200, type: WidthType.DXA },
    borders: noBorders(),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: logoBuffer
          ? [new ImageRun({ data: logoBuffer, type: 'png', transformation: { width: 72, height: 72 } })]
          : [new TextRun({ text: 'Q', bold: true, size: 72, color: GOLD, font: FONT })]
      })
    ]
  });

  const textCell = new TableCell({
    width: { size: PAGE_WIDTH - 1200, type: WidthType.DXA },
    borders: noBorders(),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: COMPANY, bold: true, size: 30, color: DARK, font: FONT })]
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: BUSINESS, bold: true, size: 15, color: BLUE, font: FONT })]
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: ADDRESS, size: 14, color: '475569', font: FONT })]
      }),
      new Paragraph({
        children: [new TextRun({ text: PHONE, size: 14, color: '475569', font: FONT })]
      })
    ]
  });

  return [
    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [1200, PAGE_WIDTH - 1200],
      borders: noBorders(),
      rows: [new TableRow({ children: [logoCell, textCell] })]
    }),
    // Garis emas pemisah kop — dibuat sebagai border bawah paragraf, bukan tabel.
    new Paragraph({
      spacing: { before: 80, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD } },
      children: []
    })
  ];
}

/** Bilah judul dokumen dengan latar gelap. */
function titleBar(text, fill = DARK) {
  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [PAGE_WIDTH],
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: PAGE_WIDTH, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            borders: noBorders(),
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 26, color: 'FFFFFF', font: FONT })]
              })
            ]
          })
        ]
      })
    ]
  });
}

function label(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 60 },
    children: [new TextRun({ text, size: opts.size ?? 20, bold: opts.bold ?? false, font: FONT, color: opts.color })]
  });
}

/** Baris isian bergaris titik-titik, seperti pada formulir cetak. */
function fillLine(labelText, widthLabel = 2200) {
  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [widthLabel, PAGE_WIDTH - widthLabel],
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: widthLabel, type: WidthType.DXA },
            borders: noBorders(),
            children: [label(labelText, { size: 20 })]
          }),
          new TableCell({
            width: { size: PAGE_WIDTH - widthLabel, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.DOTTED, size: 6, color: '94A3B8' }
            },
            children: [label(':', { size: 20 })]
          })
        ]
      })
    ]
  });
}

function footer() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 8, color: GOLD } },
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: `${COMPANY}  ·  ${PHONE}  ·  Teknisi profesional, peralatan lengkap, kerja cepat & tepat`,
            size: 13,
            color: '64748B',
            font: FONT
          })
        ]
      })
    ]
  });
}

function baseDoc(children) {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } },
        footers: { default: footer() },
        children
      }
    ]
  });
}

/* --- 1. Kop surat kosong -------------------------------------------------- */

function buildLetterheadDoc() {
  return baseDoc([
    ...letterhead(),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Bekasi, ____________________', size: 20, font: FONT })]
    }),
    label('Nomor\t\t: ______________________'),
    label('Lampiran\t: ______________________'),
    label('Perihal\t\t: ______________________', { after: 240 }),
    label('Kepada Yth.'),
    label('______________________________'),
    label('di tempat', { after: 240 }),
    label('Dengan hormat,', { after: 200 }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: ' ', size: 20 })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: ' ', size: 20 })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: ' ', size: 20 })] }),
    label('Demikian surat ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.', {
      after: 400
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 600 },
      children: [new TextRun({ text: 'Hormat kami,', size: 20, font: FONT })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: '(________________________)', size: 20, font: FONT })]
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: COMPANY, size: 18, bold: true, color: '475569', font: FONT })]
    })
  ]);
}

/* --- 2. Kwitansi ---------------------------------------------------------- */

function buildKwitansi() {
  return baseDoc([
    ...letterhead(),
    titleBar('KWITANSI', RED),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    fillLine('No.', 1800),
    fillLine('Tanggal', 1800),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    fillLine('Sudah terima dari', 3000),
    fillLine('Uang sejumlah', 3000),
    fillLine('', 3000),
    fillLine('Untuk pembayaran', 3000),
    fillLine('', 3000),
    new Paragraph({ spacing: { after: 240 }, children: [] }),
    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: GOLD, color: 'auto' },
              margins: { top: 160, bottom: 160, left: 160, right: 160 },
              borders: noBorders(),
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Rp  ______________________', bold: true, size: 26, font: FONT })]
                })
              ]
            }),
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              borders: noBorders(),
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 600 },
                  children: [new TextRun({ text: 'Hormat kami,', size: 20, font: FONT })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: '(________________________)', size: 20, font: FONT })]
                })
              ]
            })
          ]
        })
      ]
    })
  ]);
}

/* --- 3. Invoice servis kendaraan ------------------------------------------ */

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: BLUE, color: 'auto' },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 17, color: 'FFFFFF', font: FONT })]
      })
    ]
  });
}

function bodyCell(width, align = AlignmentType.LEFT, text = '') {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, size: 18, font: FONT })] })]
  });
}

function totalRow(labelText, widths, { bold = false, fill } = {}) {
  const [wLabel, wValue] = widths;
  return new TableRow({
    children: [
      new TableCell({
        width: { size: wLabel, type: WidthType.DXA },
        columnSpan: 4,
        shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: labelText, bold, size: 18, color: fill ? 'FFFFFF' : undefined, font: FONT })
            ]
          })
        ]
      }),
      new TableCell({
        width: { size: wValue, type: WidthType.DXA },
        shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '', bold, size: 18, color: fill ? 'FFFFFF' : undefined, font: FONT })]
          })
        ]
      })
    ]
  });
}

/** Daftar layanan yang dicetak di sisi kanan invoice, sesuai desain cetak. */
const SERVICE_LIST = [
  'Service Mobil',
  'Tune Up',
  'Service AC',
  'Transmisi MT/AT',
  'Ganti Oli',
  'Kaki-Kaki',
  'Scanner Mobil',
  'Turun Mesin'
];

const BODY_REPAIR_LIST = ['Poles Body', 'Cat Mobil', 'Repaint', 'Refinishing'];

/** Kotak "Layanan Kami" di kanan atas invoice. */
function serviceSidebar(width) {
  const children = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'LAYANAN KAMI', bold: true, size: 17, color: GOLD, font: FONT })]
    })
  ];
  for (const name of SERVICE_LIST) {
    children.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: `\u2713  ${name}`, size: 15, color: 'FFFFFF', font: FONT })]
      })
    );
  }
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [new TextRun({ text: 'BODY REPAIR', bold: true, size: 17, color: GOLD, font: FONT })]
    })
  );
  for (const name of BODY_REPAIR_LIST) {
    children.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: `\u2713  ${name}`, size: 15, color: 'FFFFFF', font: FONT })]
      })
    );
  }

  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: DARK, color: 'auto' },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: noBorders(),
    children
  });
}

function buildInvoice() {
  const cols = [600, 3960, 1600, 1600, 1600]; // = 9360
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('NO.', cols[0]),
        headerCell('URAIAN PEKERJAAN / BARANG', cols[1]),
        headerCell('JASA (Rp)', cols[2]),
        headerCell('SPAREPART (Rp)', cols[3]),
        headerCell('JUMLAH (Rp)', cols[4])
      ]
    })
  ];

  for (let i = 1; i <= 10; i++) {
    rows.push(
      new TableRow({
        children: [
          bodyCell(cols[0], AlignmentType.CENTER, String(i)),
          bodyCell(cols[1]),
          bodyCell(cols[2], AlignmentType.RIGHT),
          bodyCell(cols[3], AlignmentType.RIGHT),
          bodyCell(cols[4], AlignmentType.RIGHT)
        ]
      })
    );
  }

  const labelWidth = cols[0] + cols[1] + cols[2] + cols[3];
  rows.push(totalRow('TOTAL JASA', [labelWidth, cols[4]]));
  rows.push(totalRow('TOTAL SPAREPART', [labelWidth, cols[4]]));
  rows.push(totalRow('TOTAL', [labelWidth, cols[4]], { bold: true }));
  rows.push(totalRow('PPN (jika ada)', [labelWidth, cols[4]]));
  rows.push(totalRow('GRAND TOTAL', [labelWidth, cols[4]], { bold: true, fill: RED }));

  return baseDoc([
    ...letterhead(),
    titleBar('INVOICE SERVIS KENDARAAN'),
    new Paragraph({ spacing: { after: 160 }, children: [] }),

    // Identitas invoice di kiri, daftar layanan di kanan — meniru tata letak cetak.
    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [6360, 3000],
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 6360, type: WidthType.DXA },
              borders: noBorders(),
              margins: { right: 200 },
              children: [
                fillLine('No. Invoice', 1800),
                fillLine('Tanggal', 1800),
                fillLine('No. Polisi', 1800),
                fillLine('KM Kendaraan', 1800)
              ]
            }),
            serviceSidebar(3000)
          ]
        })
      ]
    }),

    new Paragraph({ spacing: { after: 200 }, children: [] }),

    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              borders: noBorders(),
              margins: { right: 160 },
              children: [
                label('DATA PELANGGAN', { bold: true, size: 18, color: BLUE }),
                fillLine('Nama', 1400),
                fillLine('Alamat', 1400),
                fillLine('No. HP', 1400)
              ]
            }),
            new TableCell({
              width: { size: 4680, type: WidthType.DXA },
              borders: noBorders(),
              children: [
                label('DATA KENDARAAN', { bold: true, size: 18, color: BLUE }),
                fillLine('Merk / Tipe', 1400),
                fillLine('Tahun', 1400),
                fillLine('Jenis', 1400)
              ]
            })
          ]
        })
      ]
    }),

    new Paragraph({ spacing: { after: 160 }, children: [] }),
    new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: cols, rows }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),

    label('CATATAN:', { bold: true, size: 18 }),
    fillLine('', 200),
    fillLine('', 200),
    new Paragraph({ spacing: { after: 300 }, children: [] }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Terima kasih atas kepercayaan Anda', italics: true, size: 20, color: '475569', font: FONT })
      ]
    })
  ]);
}

/* --- Tulis semua berkas --------------------------------------------------- */

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const docs = [
    ['Kop-Surat-Quantum.docx', buildLetterheadDoc()],
    ['Kwitansi-Quantum.docx', buildKwitansi()],
    ['Invoice-Servis-Quantum.docx', buildInvoice()]
  ];

  for (const [name, doc] of docs) {
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(OUT_DIR, name), buffer);
    console.log(`  - ${name}`);
  }
  console.log('Template Word dibuat di templates/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
