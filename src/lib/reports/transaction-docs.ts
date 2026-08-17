import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  customers,
  employees,
  payments,
  payrolls,
  serviceOrderItems,
  serviceOrders,
  workOrders
} from '@/lib/db/schema';
import { getSettings } from '@/lib/settings';
import { getWorkOrderDetail } from '@/lib/data/work-orders';
import { getServiceOrderDetail } from '@/lib/data/service-orders';
import {
  EMPLOYMENT_TYPE_LABEL,
  JOB_TYPE_LABEL,
  MONTHLY_SALARY_TYPES,
  PAYMENT_METHOD_LABEL,
  UNIT_TYPE_LABEL,
  WORK_ORDER_STATUS_LABEL
} from '@/lib/karoseri/constants';
import { formatDateId, formatIdrPlain, type ReportDocument, type ReportSection } from './document';

/**
 * Dokumen per transaksi — beda dari laporan periodik: isinya satu pekerjaan atau
 * satu pembayaran, dan bentuknya mengikuti formulir cetak yang sudah dipakai
 * bengkel (SPK, estimasi biaya, slip & bukti pembayaran, kartu kontrol servis,
 * surat hutang).
 *
 * Semuanya dibangun dari data yang sudah ada di sistem, bukan formulir kosong,
 * sehingga nomor, nama pelanggan, dan nilainya tidak perlu diketik ulang.
 */
export const TRANSACTION_DOC_TYPES = [
  'spk',
  'estimasi',
  'slip-pembayaran',
  'bukti-pembayaran',
  'kartu-servis',
  'surat-hutang',
  'slip-gaji',
  'kontrak-kerja'
] as const;

export type TransactionDocType = (typeof TRANSACTION_DOC_TYPES)[number];

export const TRANSACTION_DOC_META: Record<
  TransactionDocType,
  { title: string; menu: string; /** Jenis id yang dibutuhkan di URL. */ target: string }
> = {
  spk: { title: 'SURAT PERINTAH KERJA (SPK)', menu: 'Cetak SPK', target: 'SPK' },
  estimasi: { title: 'ESTIMASI BIAYA', menu: 'Estimasi Biaya', target: 'SPK' },
  'slip-pembayaran': { title: 'SLIP PEMBAYARAN', menu: 'Slip Pembayaran', target: 'pembayaran' },
  'bukti-pembayaran': { title: 'BUKTI PEMBAYARAN / TANDA TERIMA', menu: 'Bukti Pembayaran', target: 'pembayaran' },
  'kartu-servis': { title: 'KARTU KONTROL SERVIS', menu: 'Kartu Kontrol Servis', target: 'nomor polisi' },
  'surat-hutang': { title: 'SURAT HUTANG / PIUTANG', menu: 'Surat Hutang', target: 'SPK / order servis' },
  'slip-gaji': { title: 'SLIP GAJI KARYAWAN', menu: 'Slip Gaji', target: 'slip gaji' },
  'kontrak-kerja': { title: 'SURAT PERJANJIAN KERJA', menu: 'Kontrak Kerja', target: 'karyawan' }
};

export function isTransactionDocType(value: string): value is TransactionDocType {
  return (TRANSACTION_DOC_TYPES as readonly string[]).includes(value);
}

const dateOnly = (value: Date | null | undefined) =>
  value ? value.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/** Dokumen tidak ditemukan dibedakan dari galat lain agar route bisa membalas 404. */
export class DocumentNotFound extends Error {}

export async function buildTransactionDoc(type: TransactionDocType, id: string): Promise<ReportDocument> {
  const settings = await getSettings();
  const base = { settings, generatedAt: new Date(), title: TRANSACTION_DOC_META[type].title };

  switch (type) {
    case 'spk':
    case 'estimasi': {
      const detail = await getWorkOrderDetail(id);
      if (!detail) throw new DocumentNotFound('SPK tidak ditemukan.');
      const { workOrder, customer, model } = detail;

      const vehicle: ReportSection = {
        kind: 'fields',
        groups: [
          {
            title: 'Data Kendaraan',
            items: [
              { label: 'No. Polisi', value: workOrder.policeNumber ?? '-' },
              { label: 'Merk / Tipe', value: [workOrder.chassisBrand, workOrder.chassisType].filter(Boolean).join(' ') },
              { label: 'No. Rangka', value: workOrder.chassisNumber },
              { label: 'Warna', value: workOrder.color ?? '-' },
              { label: 'Jenis Unit', value: UNIT_TYPE_LABEL[workOrder.unitType] }
            ]
          },
          {
            title: 'Data Pemilik',
            items: [
              { label: 'Nama', value: customer.company || customer.name },
              { label: 'Alamat', value: customer.address ?? '-' },
              { label: 'No. HP', value: customer.phone }
            ]
          }
        ]
      };

      if (type === 'estimasi') {
        // Estimasi memakai tahapan sebagai rincian pekerjaan: nilainya dibagi
        // menurut bobot tiap tahap, jadi angkanya selalu berjumlah nilai kontrak.
        const rows = detail.stages.map((stage, index) => [
          index + 1,
          stage.name,
          formatIdrPlain(Math.round((workOrder.contractValueIdr * stage.weightPercent) / 100)),
          '-',
          formatIdrPlain(Math.round((workOrder.contractValueIdr * stage.weightPercent) / 100))
        ]);

        return {
          ...base,
          subtitle: `No. ${workOrder.spkNumber} · ${formatDateId(workOrder.createdAt)}`,
          sections: [
            vehicle,
            {
              kind: 'table',
              title: 'Rincian Estimasi',
              columns: [
                { label: 'NO.', align: 'center', width: 0.8 },
                { label: 'URAIAN PEKERJAAN', width: 6 },
                { label: 'JASA (Rp)', align: 'right', width: 2 },
                { label: 'SPAREPART (Rp)', align: 'right', width: 2 },
                { label: 'JUMLAH (Rp)', align: 'right', width: 2 }
              ],
              rows,
              totals: ['', 'GRAND TOTAL', '', '', formatIdrPlain(workOrder.contractValueIdr)]
            },
            {
              kind: 'note',
              text: `Estimasi berlaku sampai ${dateOnly(workOrder.targetDate)}. Nilai akhir dapat berubah bila ditemukan pekerjaan tambahan setelah unit dibongkar.`
            },
            { kind: 'signatures', items: [{ role: 'Disiapkan oleh,' }, { role: 'Menyetujui,' }] }
          ]
        };
      }

      const rows = detail.stages.map((stage, index) => [
        index + 1,
        stage.name,
        `${stage.weightPercent}%`,
        stage.picName ?? '',
        stage.status === 'done' ? 'Selesai' : stage.status === 'in_progress' ? 'Dikerjakan' : ''
      ]);

      return {
        ...base,
        subtitle: `No. SPK ${workOrder.spkNumber} · ${formatDateId(workOrder.createdAt)}`,
        sections: [
          vehicle,
          {
            kind: 'fields',
            groups: [
              {
                title: 'Kerusakan / Keluhan',
                items: [{ label: 'Uraian', value: workOrder.specNotes ?? '-' }]
              },
              {
                title: 'Data Pekerjaan',
                items: [
                  { label: 'Lini pekerjaan', value: JOB_TYPE_LABEL[workOrder.jobType] },
                  { label: 'Model bodi', value: model?.name ?? '-' },
                  { label: 'Mulai / target', value: `${dateOnly(workOrder.startDate)} - ${dateOnly(workOrder.targetDate)}` },
                  { label: 'Status', value: WORK_ORDER_STATUS_LABEL[workOrder.status] }
                ]
              }
            ]
          },
          {
            kind: 'table',
            title: 'Perintah Pekerjaan',
            columns: [
              { label: 'NO.', align: 'center', width: 0.8 },
              { label: 'URAIAN PEKERJAAN', width: 6 },
              { label: 'BOBOT', align: 'center', width: 1.2 },
              { label: 'PELAKSANA', width: 2.5 },
              { label: 'KET.', width: 2 }
            ],
            rows
          },
          ...(workOrder.insurerName
            ? [
                {
                  kind: 'fields' as const,
                  groups: [
                    {
                      title: 'Data Klaim Asuransi',
                      items: [
                        { label: 'Penanggung', value: workOrder.insurerName },
                        { label: 'No. Polis', value: workOrder.policyNumber ?? '-' },
                        { label: 'No. Klaim', value: workOrder.claimNumber ?? '-' },
                        { label: 'Surveyor', value: workOrder.surveyorName ?? '-' },
                        { label: 'Own Risk', value: `Rp ${formatIdrPlain(workOrder.deductibleIdr)}` }
                      ]
                    }
                  ]
                }
              ]
            : []),
          {
            kind: 'signatures',
            items: [{ role: 'Disiapkan oleh,' }, { role: 'Diperiksa oleh,' }, { role: 'Disetujui oleh,' }, { role: 'Diterima oleh,' }]
          }
        ]
      };
    }

    case 'slip-pembayaran':
    case 'bukti-pembayaran': {
      const db = await getDb();
      const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
      const payment = rows[0];
      if (!payment) throw new DocumentNotFound('Pembayaran tidak ditemukan.');

      // Satu tabel pembayaran melayani dua sumber, jadi konteksnya diambil sesuai
      // refType agar slip menampilkan tagihan dan sisa yang benar.
      let payerName = '-';
      let subject = payment.label;
      let totalBill = 0;
      let paidTotal = 0;

      if (payment.refType === 'work_order') {
        const detail = await getWorkOrderDetail(payment.refId);
        if (detail) {
          payerName = detail.customer.company || detail.customer.name;
          subject = `${JOB_TYPE_LABEL[detail.workOrder.jobType]} - ${detail.workOrder.spkNumber} (${payment.label})`;
          totalBill = detail.workOrder.contractValueIdr;
          paidTotal = detail.paidTotal;
        }
      } else {
        const detail = await getServiceOrderDetail(payment.refId);
        if (detail) {
          payerName = detail.customer.company || detail.customer.name;
          subject = `Servis ${detail.order.policeNumber} - ${detail.order.orderNumber} (${payment.label})`;
          totalBill = detail.order.totalIdr;
          paidTotal = detail.paidTotal;
        }
      }

      const remaining = Math.max(0, totalBill - paidTotal);
      const methodLabel = PAYMENT_METHOD_LABEL[payment.method];
      const choiceOption =
        methodLabel === 'Tunai' ? 'Tunai' : methodLabel === 'Transfer Bank' ? 'Transfer' : 'Lainnya';

      const isSlip = type === 'slip-pembayaran';

      // Nomor dokumen diturunkan dari tanggal bayar + potongan id, bukan potongan
      // id mentah, supaya terbaca rapi di arsip kertas: SL/202608/A1B2.
      const period = `${payment.paidAt.getUTCFullYear()}${String(payment.paidAt.getUTCMonth() + 1).padStart(2, '0')}`;
      const docNumber = `${isSlip ? 'SL' : 'BP'}/${period}/${payment.id.slice(-4).toUpperCase()}`;

      return {
        ...base,
        subtitle: `No. ${docNumber} · ${formatDateId(payment.paidAt)}`,
        sections: [
          {
            kind: 'fields',
            groups: [
              {
                items: [
                  { label: isSlip ? 'Sudah terima dari' : 'Telah terima dari', value: payerName },
                  { label: 'Untuk pembayaran', value: subject },
                  { label: 'Referensi', value: payment.reference ?? '-' }
                ]
              }
            ]
          },
          { kind: 'amount', label: 'Uang sejumlah', amountIdr: payment.amountIdr, showTerbilang: true },
          {
            kind: 'table',
            title: 'Rincian Pembayaran',
            columns: [
              { label: 'Keterangan', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: [
              ['Total tagihan', formatIdrPlain(totalBill)],
              [isSlip ? `Bayar (${methodLabel})` : 'Bayar', formatIdrPlain(payment.amountIdr)],
              ['Total sudah dibayar', formatIdrPlain(paidTotal)]
            ],
            totals: ['SISA TAGIHAN', formatIdrPlain(remaining)]
          },
          { kind: 'choices', label: 'Metode pembayaran', options: ['Tunai', 'Transfer', 'Lainnya'], selected: choiceOption },
          {
            kind: 'signatures',
            items: [{ role: `Bekasi, ${formatDateId(payment.paidAt)}\nHormat kami,` }, { role: 'Penerima,' }]
          }
        ]
      };
    }

    case 'kartu-servis': {
      const db = await getDb();
      const plate = decodeURIComponent(id).toUpperCase();

      const rows = await db
        .select({ order: serviceOrders, customer: customers })
        .from(serviceOrders)
        .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
        .where(sql`upper(${serviceOrders.policeNumber}) = ${plate}`)
        .orderBy(desc(serviceOrders.checkInAt))
        .limit(50);

      if (rows.length === 0) throw new DocumentNotFound('Belum ada riwayat servis untuk nomor polisi ini.');

      const first = rows[0];
      const jobsByOrder = await Promise.all(
        rows.map(async (row) => {
          const lines = await db
            .select({ name: serviceOrderItems.name })
            .from(serviceOrderItems)
            .where(eq(serviceOrderItems.serviceOrderId, row.order.id));
          return lines.map((l) => l.name).join(', ');
        })
      );

      return {
        ...base,
        subtitle: `Nomor Polisi ${plate}`,
        sections: [
          {
            kind: 'fields',
            groups: [
              {
                title: 'Data Kendaraan',
                items: [
                  { label: 'No. Polisi', value: first.order.policeNumber },
                  { label: 'Merk / Tipe', value: [first.order.vehicleBrand, first.order.vehicleModel].filter(Boolean).join(' ') || '-' },
                  { label: 'Tahun', value: first.order.vehicleYear ? String(first.order.vehicleYear) : '-' }
                ]
              },
              {
                title: 'Data Pemilik',
                items: [
                  { label: 'Pemilik', value: first.customer.company || first.customer.name },
                  { label: 'No. HP', value: first.customer.phone }
                ]
              }
            ]
          },
          {
            kind: 'table',
            columns: [
              { label: 'NO.', align: 'center', width: 0.8 },
              { label: 'TANGGAL', width: 2 },
              { label: 'KILOMETER', align: 'right', width: 1.8 },
              { label: 'JENIS SERVIS / PEKERJAAN', width: 6 },
              { label: 'TEKNISI', width: 2.2 },
              { label: 'PARAF', width: 1.4 }
            ],
            rows: rows.map((row, index) => [
              index + 1,
              dateOnly(row.order.checkInAt),
              row.order.odometerKm ? row.order.odometerKm.toLocaleString('id-ID') : '-',
              jobsByOrder[index] || row.order.diagnosis || '-',
              row.order.mechanicName ?? '-',
              ''
            ])
          },
          {
            kind: 'note',
            text: 'Kartu ini disusun otomatis dari riwayat order servis kendaraan tersebut di sistem bengkel.'
          }
        ]
      };
    }

    case 'slip-gaji': {
      const db = await getDb();
      const rows = await db
        .select({ payroll: payrolls, employee: employees })
        .from(payrolls)
        .innerJoin(employees, eq(payrolls.employeeId, employees.id))
        .where(eq(payrolls.id, id))
        .limit(1);

      const row = rows[0];
      if (!row) throw new DocumentNotFound('Slip gaji tidak ditemukan.');
      const { payroll, employee } = row;

      // Hanya komponen yang dicentang saat penggajian yang tersimpan, jadi slip
      // menampilkan apa adanya tanpa baris kosong berisi nol.
      const components = JSON.parse(payroll.componentsJson) as {
        label: string;
        type: 'penghasilan' | 'potongan';
        amountIdr: number;
        calcNote?: string | null;
      }[];

      const earnings = components.filter((c) => c.type === 'penghasilan');
      const deductions = components.filter((c) => c.type === 'potongan');
      const methodLabel = PAYMENT_METHOD_LABEL[payroll.method];

      return {
        ...base,
        subtitle: `No. ${payroll.slipNumber} · Periode ${dateOnly(payroll.periodFrom)} s/d ${dateOnly(payroll.periodTo)}`,
        sections: [
          {
            kind: 'fields',
            groups: [
              {
                title: 'Data Karyawan',
                items: [
                  { label: 'Nama Karyawan', value: employee.name },
                  { label: 'Jabatan', value: employee.position ?? '-' },
                  { label: 'Bagian', value: employee.division ?? '-' },
                  { label: 'No. Induk Karyawan', value: employee.employeeNumber ?? '-' }
                ]
              },
              {
                title: 'Data Pembayaran',
                items: [
                  { label: 'Periode Gaji', value: `${dateOnly(payroll.periodFrom)} s/d ${dateOnly(payroll.periodTo)}` },
                  { label: 'Tanggal Bayar', value: dateOnly(payroll.paidAt) },
                  { label: 'Metode Pembayaran', value: methodLabel },
                  { label: 'No. Rekening', value: employee.bankAccount ?? '-' }
                ]
              }
            ]
          },
          {
            kind: 'table',
            title: 'Penghasilan',
            columns: [
              { label: 'NO.', align: 'center', width: 0.8 },
              { label: 'JENIS PENGHASILAN', width: 5 },
              { label: 'PERHITUNGAN', width: 3 },
              { label: 'JUMLAH (Rp)', align: 'right', width: 2.5 }
            ],
            rows: earnings.map((c, i) => [i + 1, c.label, c.calcNote ?? '', formatIdrPlain(c.amountIdr)]),
            totals: ['', 'TOTAL PENGHASILAN', '', formatIdrPlain(payroll.grossIdr)]
          },
          {
            kind: 'table',
            title: 'Potongan',
            columns: [
              { label: 'NO.', align: 'center', width: 0.8 },
              { label: 'JENIS POTONGAN', width: 8 },
              { label: 'JUMLAH (Rp)', align: 'right', width: 2.5 }
            ],
            rows: deductions.length
              ? deductions.map((c, i) => [i + 1, c.label, formatIdrPlain(c.amountIdr)])
              : [],
            totals: ['', 'TOTAL POTONGAN', formatIdrPlain(payroll.deductionIdr)]
          },
          {
            kind: 'amount',
            label: 'Gaji bersih',
            amountIdr: payroll.netIdr,
            showTerbilang: true
          },
          {
            kind: 'note',
            text: `Gaji bersih = total penghasilan - total potongan.${payroll.notes ? ` Catatan: ${payroll.notes}` : ''}`
          },
          {
            kind: 'signatures',
            items: [
              { role: 'Dibuat oleh,\nBag. Keuangan' },
              { role: 'Diperiksa oleh,\nKepala Bengkel' },
              { role: 'Diterima oleh,\nKaryawan', name: employee.name }
            ]
          }
        ]
      };
    }

    case 'kontrak-kerja': {
      const db = await getDb();
      const employee = (await db.select().from(employees).where(eq(employees.id, id)).limit(1))[0];
      if (!employee) throw new DocumentNotFound('Karyawan tidak ditemukan.');

      const monthly = MONTHLY_SALARY_TYPES.includes(employee.employmentType);
      const wageLine = monthly
        ? `Gaji pokok sebesar Rp ${formatIdrPlain(employee.baseSalaryIdr)} per bulan`
        : `Upah sebesar Rp ${formatIdrPlain(employee.dailyRateIdr)} per hari kerja`;

      const periodLine = employee.contractEnd
        ? `Perjanjian ini berlaku sejak ${dateOnly(employee.contractStart ?? employee.joinDate)} sampai dengan ${dateOnly(employee.contractEnd)}.`
        : 'Perjanjian ini berlaku sejak tanggal mulai bekerja dan tidak dibatasi jangka waktu tertentu.';

      return {
        ...base,
        subtitle: `${employee.contractNumber ? `No. ${employee.contractNumber} · ` : ''}${EMPLOYMENT_TYPE_LABEL[employee.employmentType]}`,
        sections: [
          {
            kind: 'note',
            text: `Pada hari ini, ${formatDateId(new Date())}, bertempat di Kabupaten Bekasi, dibuat perjanjian kerja antara ${settings.reportCompanyName} (Pihak Pertama) dengan karyawan yang datanya tercantum di bawah ini (Pihak Kedua).`
          },
          {
            kind: 'fields',
            groups: [
              {
                title: 'Data Karyawan (Pihak Kedua)',
                items: [
                  { label: 'Nama', value: employee.name },
                  { label: 'NIK / No. KTP', value: employee.idNumber ?? '-' },
                  { label: 'Alamat', value: employee.address ?? '-' },
                  { label: 'No. HP', value: employee.phone ?? '-' }
                ]
              },
              {
                title: 'Data Kepegawaian',
                items: [
                  { label: 'No. Induk Karyawan', value: employee.employeeNumber ?? '-' },
                  { label: 'Jabatan', value: employee.position ?? '-' },
                  { label: 'Bagian', value: employee.division ?? '-' },
                  { label: 'Jenis Kepegawaian', value: EMPLOYMENT_TYPE_LABEL[employee.employmentType] },
                  { label: 'Tanggal Masuk', value: dateOnly(employee.joinDate) }
                ]
              }
            ]
          },
          {
            kind: 'table',
            title: 'Ketentuan Kerja',
            columns: [
              { label: 'PASAL', align: 'center', width: 1 },
              { label: 'ISI KETENTUAN', width: 9 }
            ],
            rows: [
              [1, `Pihak Kedua diterima bekerja pada bagian ${employee.division ?? '-'} dengan jabatan ${employee.position ?? '-'}.`],
              [2, `${wageLine}, dibayarkan sesuai jadwal penggajian yang berlaku di perusahaan.`],
              [3, periodLine],
              [4, 'Pihak Kedua wajib menaati tata tertib, jam kerja, dan ketentuan keselamatan kerja yang berlaku di bengkel.'],
              [5, 'Hal-hal yang belum diatur dalam perjanjian ini akan diselesaikan secara musyawarah oleh kedua belah pihak.']
            ]
          },
          ...(employee.notes ? [{ kind: 'note' as const, text: `Catatan tambahan: ${employee.notes}` }] : []),
          {
            kind: 'signatures',
            items: [
              { role: 'Pihak Pertama,\n' + settings.reportCompanyName },
              { role: 'Pihak Kedua,\nKaryawan', name: employee.name }
            ]
          }
        ]
      };
    }

    case 'surat-hutang': {
      // Bisa menunjuk SPK maupun order servis; dicoba SPK dulu.
      const workDetail = await getWorkOrderDetail(id);
      const serviceDetail = workDetail ? null : await getServiceOrderDetail(id);
      if (!workDetail && !serviceDetail) throw new DocumentNotFound('Transaksi tidak ditemukan.');

      const customer = workDetail ? workDetail.customer : serviceDetail!.customer;
      const total = workDetail ? workDetail.workOrder.contractValueIdr : serviceDetail!.order.totalIdr;
      const paid = workDetail ? workDetail.paidTotal : serviceDetail!.paidTotal;
      const remaining = Math.max(0, total - paid);
      const reference = workDetail ? workDetail.workOrder.spkNumber : serviceDetail!.order.orderNumber;
      const dueDate = workDetail ? workDetail.workOrder.targetDate : serviceDetail!.order.finishedAt;

      return {
        ...base,
        subtitle: `Referensi ${reference} · ${formatDateId(new Date())}`,
        sections: [
          { kind: 'note', text: 'Saya yang bertanda tangan di bawah ini,' },
          {
            kind: 'fields',
            groups: [
              {
                items: [
                  { label: 'Nama', value: customer.name },
                  { label: 'Alamat', value: customer.address ?? '-' },
                  { label: 'No. HP', value: customer.phone },
                  { label: 'Perusahaan', value: customer.company ?? '-' }
                ]
              }
            ]
          },
          {
            kind: 'note',
            text: `Menyatakan berhutang kepada ${settings.reportCompanyName} atas pekerjaan dengan referensi ${reference}, sebesar:`
          },
          { kind: 'amount', label: 'Sisa hutang', amountIdr: remaining, showTerbilang: true },
          {
            kind: 'table',
            title: 'Rincian Hutang',
            columns: [
              { label: 'Keterangan', width: 4 },
              { label: 'Jumlah (Rp)', align: 'right', width: 2 }
            ],
            rows: [
              ['Total tagihan', formatIdrPlain(total)],
              ['Sudah dibayar (uang muka / termin)', formatIdrPlain(paid)]
            ],
            totals: ['SISA HUTANG', formatIdrPlain(remaining)]
          },
          {
            kind: 'note',
            text: `Dengan ketentuan pembayaran dilunasi paling lambat tanggal ${dateOnly(dueDate)}.`
          },
          {
            kind: 'signatures',
            items: [{ role: 'Pemberi Hutang,' }, { role: 'Mengetahui,' }, { role: 'Penerima Hutang,', name: customer.name }]
          }
        ]
      };
    }
  }
}
