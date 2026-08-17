import {
  getCashBook,
  getCashFlow,
  getIncomeExpenseReport,
  getInventoryReport,
  getPayables,
  getProfitLoss,
  getReceivables,
  type Period
} from '@/lib/data/reports';
import { getSettings } from '@/lib/settings';
import { formatIdrPlain, periodLabel, type ReportDocument } from './document';

/**
 * Tujuh jenis laporan yang tersedia. Kuncinya dipakai sebagai bagian URL
 * (`/panel/laporan/<kunci>`) sekaligus parameter endpoint unduhan, jadi satu
 * daftar ini yang menentukan menu, halaman, dan berkas unduhan sekaligus.
 */
export const REPORT_TYPES = [
  'laba-rugi',
  'arus-kas',
  'buku-kas',
  'pemasukan-pengeluaran',
  'piutang',
  'utang',
  'persediaan'
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_META: Record<ReportType, { title: string; menu: string; description: string; icon: string }> = {
  'laba-rugi': {
    title: 'LAPORAN LABA RUGI',
    menu: 'Laba Rugi',
    description: 'Pendapatan, harga pokok, biaya operasional, pajak, dan laba bersih.',
    icon: '📈'
  },
  'arus-kas': {
    title: 'LAPORAN ARUS KAS',
    menu: 'Arus Kas',
    description: 'Uang masuk dan keluar beserta saldo awal dan saldo akhir periode.',
    icon: '💵'
  },
  'buku-kas': {
    title: 'BUKU KAS SEDERHANA',
    menu: 'Buku Kas',
    description: 'Seluruh mutasi kas urut tanggal dengan saldo berjalan.',
    icon: '📒'
  },
  'pemasukan-pengeluaran': {
    title: 'LAPORAN PEMASUKAN & PENGELUARAN',
    menu: 'Pemasukan & Pengeluaran',
    description: 'Rincian pemasukan dan pengeluaran terpisah beserta saldo bersih.',
    icon: '🧾'
  },
  piutang: {
    title: 'LAPORAN PIUTANG PELANGGAN',
    menu: 'Piutang',
    description: 'Tagihan yang belum dibayar pelanggan dari SPK maupun order servis.',
    icon: '📥'
  },
  utang: {
    title: 'LAPORAN UTANG USAHA',
    menu: 'Utang',
    description: 'Pembelian dan biaya yang belum dilunasi beserta jatuh temponya.',
    icon: '📤'
  },
  persediaan: {
    title: 'LAPORAN PERSEDIAAN BARANG',
    menu: 'Persediaan',
    description: 'Nilai stok sparepart berdasarkan harga modal terakhir.',
    icon: '📦'
  }
};

export function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

const shortDate = (value: Date | null) =>
  value ? value.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export async function buildReport(type: ReportType, period: Period): Promise<ReportDocument> {
  const settings = await getSettings();
  const base = { settings, generatedAt: new Date(), title: REPORT_META[type].title };

  switch (type) {
    case 'laba-rugi': {
      const r = await getProfitLoss(period);
      return {
        ...base,
        subtitle: periodLabel(period.from, period.to),
        sections: [
          {
            kind: 'table',
            title: 'Pendapatan',
            columns: [
              { label: 'Keterangan', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: [
              [`Karoseri (${r.counts.karoseri} unit selesai)`, formatIdrPlain(r.revenue.karoseri)],
              [`Body repair (${r.counts.bodyRepair} unit selesai)`, formatIdrPlain(r.revenue.bodyRepair)],
              [`Servis - jasa (${r.counts.service} order)`, formatIdrPlain(r.revenue.serviceJasa)],
              ['Servis - penjualan barang', formatIdrPlain(r.revenue.serviceBarang)]
            ],
            totals: ['TOTAL PENDAPATAN', formatIdrPlain(r.revenue.total)]
          },
          {
            kind: 'table',
            title: 'Harga pokok penjualan',
            columns: [
              { label: 'Keterangan', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: [
              ['Harga modal barang terjual', formatIdrPlain(r.cogs.barangTerjual)],
              ['Bahan & material produksi', formatIdrPlain(r.cogs.bahanProduksi)]
            ],
            totals: ['TOTAL HPP', formatIdrPlain(r.cogs.total)]
          },
          {
            kind: 'summary',
            items: [{ label: 'LABA KOTOR', value: formatIdrPlain(r.grossProfit), emphasis: true }]
          },
          {
            kind: 'table',
            title: 'Biaya operasional',
            columns: [
              { label: 'Kategori', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: r.operatingExpenses.map((e) => [e.label, formatIdrPlain(e.amount)]),
            totals: ['TOTAL BIAYA OPERASIONAL', formatIdrPlain(r.operatingExpenseTotal)]
          },
          {
            kind: 'summary',
            title: 'Hasil usaha',
            items: [
              { label: 'Laba usaha (sebelum pajak)', value: formatIdrPlain(r.operatingProfit) },
              {
                label: r.tax.enabled
                  ? `PPh ${r.tax.percent}% dari ${r.tax.basis.toLowerCase()}`
                  : 'PPh (belum diaktifkan di pengaturan)',
                value: formatIdrPlain(-r.tax.amount)
              },
              { label: 'LABA BERSIH', value: formatIdrPlain(r.netProfit), emphasis: true }
            ]
          },
          {
            kind: 'note',
            text:
              'Metode: pendapatan diakui saat pekerjaan dinyatakan selesai, bukan saat uang diterima. ' +
              'Pendapatan servis dicatat tanpa PPN karena PPN bukan penghasilan bengkel' +
              (r.vat.enabled ? ` (PPN terkumpul periode ini: Rp ${formatIdrPlain(r.vat.collected)}).` : '.') +
              ' Biaya diakui saat terjadi.'
          }
        ]
      };
    }

    case 'arus-kas': {
      const r = await getCashFlow(period);
      return {
        ...base,
        subtitle: periodLabel(period.from, period.to),
        sections: [
          {
            kind: 'summary',
            title: 'Saldo awal',
            items: [{ label: 'Saldo kas awal periode', value: formatIdrPlain(r.openingBalance) }]
          },
          {
            kind: 'table',
            title: 'Kas masuk',
            columns: [
              { label: 'Sumber', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: [
              ['Pembayaran pelanggan', formatIdrPlain(r.inflow.customerPayments)],
              ['Setoran modal pemilik', formatIdrPlain(r.inflow.capitalDeposits)]
            ],
            totals: ['TOTAL KAS MASUK', formatIdrPlain(r.inflow.total)]
          },
          {
            kind: 'table',
            title: 'Kas keluar',
            columns: [
              { label: 'Tujuan', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: [
              ['Pembelian barang', formatIdrPlain(r.outflow.purchases)],
              ['Biaya operasional dibayar', formatIdrPlain(r.outflow.expenses)],
              ['Penarikan modal (prive)', formatIdrPlain(r.outflow.capitalWithdrawals)]
            ],
            totals: ['TOTAL KAS KELUAR', formatIdrPlain(r.outflow.total)]
          },
          {
            kind: 'summary',
            items: [
              { label: 'Perubahan kas bersih', value: formatIdrPlain(r.netChange) },
              { label: 'SALDO KAS AKHIR', value: formatIdrPlain(r.closingBalance), emphasis: true }
            ]
          },
          {
            kind: 'note',
            text:
              'Saldo awal dihitung ulang dari kas awal di pengaturan ditambah seluruh mutasi sebelum tanggal ' +
              'mulai, sehingga tetap benar walau transaksi lama disisipkan belakangan.'
          }
        ]
      };
    }

    case 'buku-kas': {
      const r = await getCashBook(period);
      return {
        ...base,
        subtitle: periodLabel(period.from, period.to),
        sections: [
          {
            kind: 'summary',
            items: [{ label: 'Saldo awal periode', value: formatIdrPlain(r.openingBalance) }]
          },
          {
            kind: 'table',
            columns: [
              { label: 'TANGGAL', width: 2 },
              { label: 'KETERANGAN', width: 6 },
              { label: 'PENERIMAAN', align: 'right', width: 2 },
              { label: 'PENGELUARAN', align: 'right', width: 2 },
              { label: 'SALDO', align: 'right', width: 2 }
            ],
            rows: r.rows.map((row) => [
              shortDate(row.date),
              row.description,
              row.inIdr ? formatIdrPlain(row.inIdr) : '-',
              row.outIdr ? formatIdrPlain(row.outIdr) : '-',
              formatIdrPlain(row.balanceIdr)
            ]),
            totals: ['TOTAL', '', formatIdrPlain(r.totalIn), formatIdrPlain(r.totalOut), formatIdrPlain(r.closingBalance)]
          }
        ]
      };
    }

    case 'pemasukan-pengeluaran': {
      const r = await getIncomeExpenseReport(period);
      return {
        ...base,
        subtitle: periodLabel(period.from, period.to),
        sections: [
          {
            kind: 'table',
            title: 'A. Pemasukan',
            columns: [
              { label: 'TANGGAL', width: 2 },
              { label: 'KETERANGAN', width: 7 },
              { label: 'JUMLAH (Rp)', align: 'right', width: 3 }
            ],
            rows: r.income.map((row) => [shortDate(row.date), row.description, formatIdrPlain(row.amountIdr)]),
            totals: ['TOTAL PEMASUKAN', '', formatIdrPlain(r.totalIncome)]
          },
          {
            kind: 'table',
            title: 'B. Pengeluaran',
            columns: [
              { label: 'TANGGAL', width: 2 },
              { label: 'KETERANGAN', width: 7 },
              { label: 'JUMLAH (Rp)', align: 'right', width: 3 }
            ],
            rows: r.expense.map((row) => [shortDate(row.date), row.description, formatIdrPlain(row.amountIdr)]),
            totals: ['TOTAL PENGELUARAN', '', formatIdrPlain(r.totalExpense)]
          },
          {
            kind: 'summary',
            items: [
              {
                label: 'SALDO BERSIH ( Pemasukan - Pengeluaran )',
                value: formatIdrPlain(r.netIdr),
                emphasis: true
              }
            ]
          }
        ]
      };
    }

    case 'piutang': {
      const r = await getReceivables();
      return {
        ...base,
        subtitle: `Posisi per ${shortDate(new Date())}`,
        sections: [
          {
            kind: 'table',
            columns: [
              { label: 'SUMBER', width: 1.4 },
              { label: 'NOMOR', width: 2.4 },
              { label: 'PELANGGAN', width: 3.2 },
              { label: 'NILAI', align: 'right', width: 2 },
              { label: 'DIBAYAR', align: 'right', width: 2 },
              { label: 'SISA', align: 'right', width: 2 },
              { label: 'UMUR', align: 'right', width: 1.4 }
            ],
            rows: r.rows.map((row) => [
              row.source,
              row.number,
              row.customer,
              formatIdrPlain(row.totalIdr),
              formatIdrPlain(row.paidIdr),
              formatIdrPlain(row.outstandingIdr),
              row.ageDays === null ? '-' : row.ageDays > 0 ? `${row.ageDays} hr` : 'belum jatuh tempo'
            ]),
            totals: ['TOTAL PIUTANG', '', '', '', '', formatIdrPlain(r.total), '']
          },
          {
            kind: 'note',
            text: 'Umur dihitung dari target selesai (SPK) atau tanggal selesai servis. Angka positif berarti sudah lewat jatuh tempo.'
          }
        ]
      };
    }

    case 'utang': {
      const r = await getPayables();
      return {
        ...base,
        subtitle: `Posisi per ${shortDate(new Date())}`,
        sections: [
          {
            kind: 'table',
            columns: [
              { label: 'SUMBER', width: 1.6 },
              { label: 'REFERENSI', width: 2.6 },
              { label: 'PIHAK', width: 3 },
              { label: 'KETERANGAN', width: 3 },
              { label: 'SISA (Rp)', align: 'right', width: 2.2 },
              { label: 'JATUH TEMPO', align: 'right', width: 2 }
            ],
            rows: r.rows.map((row) => [
              row.source,
              row.reference,
              row.vendor,
              row.description,
              formatIdrPlain(row.outstandingIdr),
              shortDate(row.dueDate)
            ]),
            totals: ['TOTAL UTANG', '', '', '', formatIdrPlain(r.total), '']
          }
        ]
      };
    }

    case 'persediaan': {
      const r = await getInventoryReport();
      return {
        ...base,
        subtitle: `Posisi per ${shortDate(new Date())}`,
        sections: [
          {
            kind: 'table',
            columns: [
              { label: 'KODE', width: 2 },
              { label: 'NAMA BARANG', width: 5 },
              { label: 'STOK', align: 'right', width: 1.4 },
              { label: 'MIN', align: 'right', width: 1.2 },
              { label: 'HARGA MODAL', align: 'right', width: 2.2 },
              { label: 'NILAI (Rp)', align: 'right', width: 2.4 }
            ],
            rows: r.rows.map((row) => [
              row.code,
              `${row.name}${row.lowStock ? ' (stok menipis)' : ''}`,
              `${row.stockQty} ${row.unit}`,
              String(row.minStockQty),
              formatIdrPlain(row.costPriceIdr),
              formatIdrPlain(row.valueIdr)
            ]),
            totals: ['TOTAL NILAI PERSEDIAAN', '', '', '', '', formatIdrPlain(r.totalValue)]
          },
          {
            kind: 'note',
            text: `${r.lowStockCount} barang berada pada atau di bawah stok minimum dan perlu dipesan ulang.`
          }
        ]
      };
    }
  }
}
