import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { getDb } from '@/lib/db/client';
import {
  capitalEntries,
  customers,
  expenses,
  items,
  payments,
  purchases,
  serviceOrders,
  suppliers,
  workOrders
} from '@/lib/db/schema';
import { getSettings, type AppSettings } from '@/lib/settings';
import {
  COGS_EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  JOB_TYPE_LABEL,
  SERVICE_DONE_STATUSES,
  type ExpenseCategory
} from '@/lib/karoseri/constants';

export type Period = { from: Date; to: Date };

/** Rentang bulan berjalan, dipakai sebagai default seluruh halaman laporan. */
export function currentMonthPeriod(): Period {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from, to };
}

export function periodFromParams(fromParam?: string, toParam?: string): Period {
  const fallback = currentMonthPeriod();
  const from = parseDayStart(fromParam) ?? fallback.from;
  const to = parseDayEnd(toParam) ?? fallback.to;
  // Rentang terbalik hampir pasti salah ketik; tukar saja daripada menghasilkan
  // laporan kosong yang membingungkan.
  return from <= to ? { from, to } : { from: to, to: from };
}

function parseDayStart(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : new Date(ms);
}

function parseDayEnd(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T23:59:59.999Z`);
  return Number.isNaN(ms) ? null : new Date(ms);
}

export type ProfitLossReport = {
  period: Period;
  settings: AppSettings;
  revenue: {
    karoseri: number;
    bodyRepair: number;
    serviceJasa: number;
    serviceBarang: number;
    total: number;
  };
  cogs: {
    barangTerjual: number;
    bahanProduksi: number;
    total: number;
  };
  grossProfit: number;
  operatingExpenses: { category: ExpenseCategory; label: string; amount: number }[];
  operatingExpenseTotal: number;
  operatingProfit: number;
  tax: { basis: string; percent: number; amount: number; enabled: boolean };
  netProfit: number;
  /** Info tambahan, bukan bagian laba rugi. */
  vat: { collected: number; enabled: boolean };
  counts: { karoseri: number; bodyRepair: number; service: number };
};

/**
 * Laporan laba rugi.
 *
 * Metode yang dipakai — sengaja dibuat eksplisit karena menentukan angkanya:
 * - **Pendapatan** diakui saat pekerjaan dinyatakan rampung (`completedAt` untuk
 *   SPK, `finishedAt` untuk order servis), bukan saat uangnya masuk. Uang yang
 *   sudah diterima tapi pekerjaannya belum selesai belum menjadi pendapatan.
 * - **Pendapatan servis dicatat tanpa PPN**, karena PPN adalah titipan negara,
 *   bukan penghasilan bengkel. Nilainya dilaporkan terpisah.
 * - **HPP** terdiri dari harga modal barang yang terjual (disalin saat transaksi)
 *   dan biaya berkategori bahan produksi yang terjadi dalam periode.
 * - **Biaya operasional** diakui saat terjadi (`spentAt`), bukan saat dibayar.
 */
export async function getProfitLoss(period: Period): Promise<ProfitLossReport> {
  const db = await getDb();
  const settings = await getSettings();

  const completedInPeriod = and(
    gte(workOrders.completedAt, period.from),
    lte(workOrders.completedAt, period.to),
    ne(workOrders.status, 'batal')
  );

  const [karoseriRow, bodyRepairRow, serviceRow, cogsExpenseRow, opexRows] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${workOrders.contractValueIdr}), 0)`,
        count: sql<number>`count(*)`
      })
      .from(workOrders)
      .where(and(completedInPeriod, eq(workOrders.jobType, 'karoseri'))),
    db
      .select({
        total: sql<number>`coalesce(sum(${workOrders.contractValueIdr}), 0)`,
        count: sql<number>`count(*)`
      })
      .from(workOrders)
      .where(and(completedInPeriod, eq(workOrders.jobType, 'body_repair'))),
    db
      .select({
        net: sql<number>`coalesce(sum(${serviceOrders.totalIdr} - ${serviceOrders.taxIdr}), 0)`,
        tax: sql<number>`coalesce(sum(${serviceOrders.taxIdr}), 0)`,
        cogs: sql<number>`coalesce(sum(${serviceOrders.cogsIdr}), 0)`,
        count: sql<number>`count(*)`
      })
      .from(serviceOrders)
      .where(
        and(
          inArray(serviceOrders.status, SERVICE_DONE_STATUSES),
          gte(serviceOrders.finishedAt, period.from),
          lte(serviceOrders.finishedAt, period.to)
        )
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amountIdr}), 0)` })
      .from(expenses)
      .where(
        and(
          inArray(expenses.category, COGS_EXPENSE_CATEGORIES),
          gte(expenses.spentAt, period.from),
          lte(expenses.spentAt, period.to)
        )
      ),
    db
      .select({
        category: expenses.category,
        total: sql<number>`coalesce(sum(${expenses.amountIdr}), 0)`
      })
      .from(expenses)
      .where(
        and(
          sql`${expenses.category} NOT IN (${sql.join(
            COGS_EXPENSE_CATEGORIES.map((c) => sql`${c}`),
            sql`, `
          )})`,
          gte(expenses.spentAt, period.from),
          lte(expenses.spentAt, period.to)
        )
      )
      .groupBy(expenses.category)
      .orderBy(desc(sql`sum(${expenses.amountIdr})`))
  ]);

  const karoseri = karoseriRow[0]?.total ?? 0;
  const bodyRepair = bodyRepairRow[0]?.total ?? 0;
  const serviceNet = serviceRow[0]?.net ?? 0;
  const serviceCogs = serviceRow[0]?.cogs ?? 0;
  const vatCollected = serviceRow[0]?.tax ?? 0;

  // Pendapatan servis dipecah jasa vs barang berdasarkan proporsi baris ordernya.
  const serviceSplit = await getServiceRevenueSplit(period);
  const scale = serviceNet > 0 && serviceSplit.total > 0 ? serviceNet / serviceSplit.total : 0;
  const serviceJasa = Math.round(serviceSplit.jasa * scale);
  const serviceBarang = Math.max(0, serviceNet - serviceJasa);

  const revenueTotal = karoseri + bodyRepair + serviceNet;
  const bahanProduksi = cogsExpenseRow[0]?.total ?? 0;
  const cogsTotal = serviceCogs + bahanProduksi;
  const grossProfit = revenueTotal - cogsTotal;

  const operatingExpenses = opexRows.map((row) => ({
    category: row.category,
    label: EXPENSE_CATEGORY_LABEL[row.category] ?? row.category,
    amount: row.total
  }));
  const operatingExpenseTotal = operatingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const operatingProfit = grossProfit - operatingExpenseTotal;

  // PPh final UMKM dihitung dari omzet, PPh badan dari laba usaha. Laba usaha
  // yang negatif tidak menghasilkan pajak.
  const taxBaseAmount = settings.pphBase === 'omzet' ? revenueTotal : Math.max(0, operatingProfit);
  const taxAmount = settings.pphEnabled ? Math.round((taxBaseAmount * settings.pphPercent) / 100) : 0;

  return {
    period,
    settings,
    revenue: {
      karoseri,
      bodyRepair,
      serviceJasa,
      serviceBarang,
      total: revenueTotal
    },
    cogs: { barangTerjual: serviceCogs, bahanProduksi, total: cogsTotal },
    grossProfit,
    operatingExpenses,
    operatingExpenseTotal,
    operatingProfit,
    tax: {
      basis: settings.pphBase === 'omzet' ? 'Omzet (peredaran bruto)' : 'Laba usaha',
      percent: settings.pphPercent,
      amount: taxAmount,
      enabled: settings.pphEnabled
    },
    netProfit: operatingProfit - taxAmount,
    vat: { collected: vatCollected, enabled: settings.ppnEnabled },
    counts: {
      karoseri: karoseriRow[0]?.count ?? 0,
      bodyRepair: bodyRepairRow[0]?.count ?? 0,
      service: serviceRow[0]?.count ?? 0
    }
  };
}

/** Proporsi nilai baris jasa vs barang pada order servis yang selesai di periode. */
async function getServiceRevenueSplit(period: Period): Promise<{ jasa: number; barang: number; total: number }> {
  const db = await getDb();
  const rows = await db
    .select({
      kind: sql<string>`soi.kind`,
      total: sql<number>`coalesce(sum(soi.subtotal_idr), 0)`
    })
    .from(sql`service_order_items soi`)
    .innerJoin(serviceOrders, sql`soi.service_order_id = ${serviceOrders.id}`)
    .where(
      and(
        inArray(serviceOrders.status, SERVICE_DONE_STATUSES),
        gte(serviceOrders.finishedAt, period.from),
        lte(serviceOrders.finishedAt, period.to)
      )
    )
    .groupBy(sql`soi.kind`);

  const jasa = rows.find((r) => r.kind === 'jasa')?.total ?? 0;
  const barang = rows.find((r) => r.kind === 'barang')?.total ?? 0;
  return { jasa, barang, total: jasa + barang };
}

export type ReceivableRow = {
  id: string;
  source: 'SPK' | 'Servis';
  number: string;
  customer: string;
  label: string;
  totalIdr: number;
  paidIdr: number;
  outstandingIdr: number;
  dueDate: Date | null;
  ageDays: number | null;
};

/** Piutang: nilai pekerjaan yang belum dibayar pelanggan, dari SPK maupun order servis. */
export async function getReceivables(): Promise<{ rows: ReceivableRow[]; total: number }> {
  const db = await getDb();

  const paidForWorkOrder = sql<number>`coalesce((
    select sum(${payments.amountIdr}) from ${payments}
    where ${payments.refType} = 'work_order' and ${payments.refId} = ${workOrders.id}
  ), 0)`;

  const paidForService = sql<number>`coalesce((
    select sum(${payments.amountIdr}) from ${payments}
    where ${payments.refType} = 'service_order' and ${payments.refId} = ${serviceOrders.id}
  ), 0)`;

  const [workRows, serviceRows] = await Promise.all([
    db
      .select({
        id: workOrders.id,
        number: workOrders.spkNumber,
        jobType: workOrders.jobType,
        customerName: customers.name,
        customerCompany: customers.company,
        totalIdr: workOrders.contractValueIdr,
        paidIdr: paidForWorkOrder,
        dueDate: workOrders.targetDate
      })
      .from(workOrders)
      .innerJoin(customers, eq(workOrders.customerId, customers.id))
      .where(ne(workOrders.status, 'batal')),
    db
      .select({
        id: serviceOrders.id,
        number: serviceOrders.orderNumber,
        customerName: customers.name,
        customerCompany: customers.company,
        policeNumber: serviceOrders.policeNumber,
        totalIdr: serviceOrders.totalIdr,
        paidIdr: paidForService,
        dueDate: serviceOrders.finishedAt
      })
      .from(serviceOrders)
      .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
      .where(ne(serviceOrders.status, 'batal'))
  ]);

  const rows: ReceivableRow[] = [];

  for (const row of workRows) {
    const outstanding = row.totalIdr - row.paidIdr;
    if (outstanding <= 0) continue;
    rows.push({
      id: row.id,
      source: 'SPK',
      number: row.number,
      customer: row.customerCompany || row.customerName,
      label: JOB_TYPE_LABEL[row.jobType],
      totalIdr: row.totalIdr,
      paidIdr: row.paidIdr,
      outstandingIdr: outstanding,
      dueDate: row.dueDate,
      ageDays: ageInDays(row.dueDate)
    });
  }

  for (const row of serviceRows) {
    const outstanding = row.totalIdr - row.paidIdr;
    if (outstanding <= 0) continue;
    rows.push({
      id: row.id,
      source: 'Servis',
      number: row.number,
      customer: row.customerCompany || row.customerName,
      label: row.policeNumber,
      totalIdr: row.totalIdr,
      paidIdr: row.paidIdr,
      outstandingIdr: outstanding,
      dueDate: row.dueDate,
      ageDays: ageInDays(row.dueDate)
    });
  }

  rows.sort((a, b) => b.outstandingIdr - a.outstandingIdr);
  return { rows, total: rows.reduce((sum, r) => sum + r.outstandingIdr, 0) };
}

export type PayableRow = {
  id: string;
  source: 'Pembelian' | 'Biaya';
  reference: string;
  vendor: string;
  description: string;
  totalIdr: number;
  paidIdr: number;
  outstandingIdr: number;
  dueDate: Date | null;
  ageDays: number | null;
};

/** Utang: pembelian yang belum lunas dan biaya yang belum dibayar. */
export async function getPayables(): Promise<{ rows: PayableRow[]; total: number }> {
  const db = await getDb();

  const [purchaseRows, expenseRows] = await Promise.all([
    db
      .select({
        id: purchases.id,
        number: purchases.purchaseNumber,
        invoiceNumber: purchases.invoiceNumber,
        supplierName: purchases.supplierName,
        supplierMaster: suppliers.name,
        totalIdr: purchases.totalIdr,
        paidIdr: purchases.paidIdr,
        dueDate: purchases.dueDate
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(sql`${purchases.totalIdr} > ${purchases.paidIdr}`),
    db
      .select({
        id: expenses.id,
        category: expenses.category,
        description: expenses.description,
        vendorName: expenses.vendorName,
        amountIdr: expenses.amountIdr,
        dueDate: expenses.dueDate
      })
      .from(expenses)
      .where(isNull(expenses.paidAt))
  ]);

  const rows: PayableRow[] = [];

  for (const row of purchaseRows) {
    rows.push({
      id: row.id,
      source: 'Pembelian',
      reference: row.invoiceNumber || row.number,
      vendor: row.supplierMaster || row.supplierName || '—',
      description: 'Pembelian barang',
      totalIdr: row.totalIdr,
      paidIdr: row.paidIdr,
      outstandingIdr: row.totalIdr - row.paidIdr,
      dueDate: row.dueDate,
      ageDays: ageInDays(row.dueDate)
    });
  }

  for (const row of expenseRows) {
    rows.push({
      id: row.id,
      source: 'Biaya',
      reference: EXPENSE_CATEGORY_LABEL[row.category] ?? row.category,
      vendor: row.vendorName || '—',
      description: row.description,
      totalIdr: row.amountIdr,
      paidIdr: 0,
      outstandingIdr: row.amountIdr,
      dueDate: row.dueDate,
      ageDays: ageInDays(row.dueDate)
    });
  }

  rows.sort((a, b) => b.outstandingIdr - a.outstandingIdr);
  return { rows, total: rows.reduce((sum, r) => sum + r.outstandingIdr, 0) };
}

/** Umur tunggakan dalam hari; positif berarti sudah lewat jatuh tempo. */
function ageInDays(due: Date | null): number | null {
  if (!due) return null;
  return Math.floor((Date.now() - due.getTime()) / (24 * 60 * 60 * 1000));
}

export type CashFlowReport = {
  period: Period;
  openingBalance: number;
  inflow: { customerPayments: number; capitalDeposits: number; total: number };
  outflow: { purchases: number; expenses: number; capitalWithdrawals: number; total: number };
  netChange: number;
  closingBalance: number;
};

/**
 * Arus kas sederhana berbasis uang yang benar-benar berpindah.
 *
 * Saldo awal periode dihitung ulang dari kas awal yang diisi admin ditambah
 * seluruh mutasi sebelum tanggal mulai — jadi angkanya tetap benar walau
 * transaksi lama disisipkan belakangan.
 */
export async function getCashFlow(period: Period): Promise<CashFlowReport> {
  const settings = await getSettings();
  const [before, during] = await Promise.all([
    sumCashMovement(null, new Date(period.from.getTime() - 1)),
    sumCashMovement(period.from, period.to)
  ]);

  const openingBalance = settings.openingCashIdr + before.inflowTotal - before.outflowTotal;
  const netChange = during.inflowTotal - during.outflowTotal;

  return {
    period,
    openingBalance,
    inflow: {
      customerPayments: during.customerPayments,
      capitalDeposits: during.capitalDeposits,
      total: during.inflowTotal
    },
    outflow: {
      purchases: during.purchasePaid,
      expenses: during.expensePaid,
      capitalWithdrawals: during.capitalWithdrawals,
      total: during.outflowTotal
    },
    netChange,
    closingBalance: openingBalance + netChange
  };
}

async function sumCashMovement(from: Date | null, to: Date) {
  const db = await getDb();

  const range = (column: Parameters<typeof gte>[0]) =>
    from ? and(gte(column, from), lte(column, to)) : lte(column, to);

  const [paymentRow, capitalRows, purchaseRow, expenseRow] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountIdr}), 0)` })
      .from(payments)
      .where(range(payments.paidAt)),
    db
      .select({
        type: capitalEntries.type,
        total: sql<number>`coalesce(sum(${capitalEntries.amountIdr}), 0)`
      })
      .from(capitalEntries)
      .where(range(capitalEntries.entryAt))
      .groupBy(capitalEntries.type),
    db
      .select({ total: sql<number>`coalesce(sum(${purchases.paidIdr}), 0)` })
      .from(purchases)
      .where(range(purchases.purchasedAt)),
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amountIdr}), 0)` })
      .from(expenses)
      .where(range(expenses.paidAt))
  ]);

  const customerPayments = paymentRow[0]?.total ?? 0;
  const capitalDeposits = capitalRows.find((r) => r.type === 'setoran')?.total ?? 0;
  const capitalWithdrawals = capitalRows.find((r) => r.type === 'penarikan')?.total ?? 0;
  const purchasePaid = purchaseRow[0]?.total ?? 0;
  const expensePaid = expenseRow[0]?.total ?? 0;

  return {
    customerPayments,
    capitalDeposits,
    purchasePaid,
    expensePaid,
    capitalWithdrawals,
    inflowTotal: customerPayments + capitalDeposits,
    outflowTotal: purchasePaid + expensePaid + capitalWithdrawals
  };
}

export type InventoryReport = {
  rows: {
    id: string;
    code: string;
    name: string;
    unit: string;
    stockQty: number;
    minStockQty: number;
    costPriceIdr: number;
    sellPriceIdr: number;
    valueIdr: number;
    lowStock: boolean;
  }[];
  totalValue: number;
  lowStockCount: number;
};

/** Nilai persediaan barang berdasarkan harga modal terakhir. */
export async function getInventoryReport(): Promise<InventoryReport> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(items)
    .where(eq(items.kind, 'barang'))
    .orderBy(asc(items.code));

  const mapped = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    unit: row.unit,
    stockQty: row.stockQty,
    minStockQty: row.minStockQty,
    costPriceIdr: row.costPriceIdr,
    sellPriceIdr: row.sellPriceIdr,
    valueIdr: row.stockQty * row.costPriceIdr,
    lowStock: row.stockQty <= row.minStockQty
  }));

  return {
    rows: mapped,
    totalValue: mapped.reduce((sum, r) => sum + r.valueIdr, 0),
    lowStockCount: mapped.filter((r) => r.lowStock).length
  };
}

/** Ringkasan untuk dashboard pemilik: satu layar berisi angka-angka penting. */
export async function getOwnerSummary(period: Period) {
  const [profitLoss, receivables, payables, cashFlow, inventory] = await Promise.all([
    getProfitLoss(period),
    getReceivables(),
    getPayables(),
    getCashFlow(period),
    getInventoryReport()
  ]);

  return { profitLoss, receivables, payables, cashFlow, inventory };
}

export type CashBookRow = {
  date: Date;
  description: string;
  reference: string;
  inIdr: number;
  outIdr: number;
  balanceIdr: number;
};

/**
 * Buku kas: seluruh perpindahan uang dalam periode, urut tanggal, dengan saldo
 * berjalan — bentuk yang sama dengan buku kas manual yang dipakai bengkel.
 *
 * Saldo baris pertama meneruskan saldo akhir sebelum periode, bukan mulai dari
 * nol, supaya buku kas bulan ini nyambung dengan bulan sebelumnya.
 */
export async function getCashBook(period: Period): Promise<{
  openingBalance: number;
  rows: CashBookRow[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}> {
  const db = await getDb();
  const settings = await getSettings();
  const before = await sumCashMovement(null, new Date(period.from.getTime() - 1));
  const openingBalance = settings.openingCashIdr + before.inflowTotal - before.outflowTotal;

  // Kolom tanggal yang boleh null (mis. expenses.paidAt) tetap aman: baris tanpa
  // tanggal otomatis tidak lolos perbandingan, jadi biaya yang belum dibayar
  // tidak pernah muncul di buku kas.
  const inRange = (column: SQLiteColumn) => and(gte(column, period.from), lte(column, period.to));

  const [paymentRows, capitalRows, purchaseRows, expenseRows] = await Promise.all([
    db
      .select({
        paidAt: payments.paidAt,
        label: payments.label,
        refType: payments.refType,
        refId: payments.refId,
        amountIdr: payments.amountIdr,
        reference: payments.reference
      })
      .from(payments)
      .where(inRange(payments.paidAt)),
    db
      .select({
        entryAt: capitalEntries.entryAt,
        type: capitalEntries.type,
        ownerName: capitalEntries.ownerName,
        amountIdr: capitalEntries.amountIdr,
        notes: capitalEntries.notes
      })
      .from(capitalEntries)
      .where(inRange(capitalEntries.entryAt)),
    db
      .select({
        purchasedAt: purchases.purchasedAt,
        purchaseNumber: purchases.purchaseNumber,
        supplierName: purchases.supplierName,
        paidIdr: purchases.paidIdr,
        invoiceNumber: purchases.invoiceNumber
      })
      .from(purchases)
      .where(and(inRange(purchases.purchasedAt), sql`${purchases.paidIdr} > 0`)),
    db
      .select({
        paidAt: expenses.paidAt,
        category: expenses.category,
        description: expenses.description,
        amountIdr: expenses.amountIdr
      })
      .from(expenses)
      .where(inRange(expenses.paidAt))
  ]);

  const raw: Omit<CashBookRow, 'balanceIdr'>[] = [];

  for (const row of paymentRows) {
    raw.push({
      date: row.paidAt,
      description: `Pembayaran ${row.refType === 'work_order' ? 'SPK' : 'servis'} — ${row.label}`,
      reference: row.reference ?? '',
      inIdr: row.amountIdr,
      outIdr: 0
    });
  }
  for (const row of capitalRows) {
    const isDeposit = row.type === 'setoran';
    raw.push({
      date: row.entryAt,
      description: `${isDeposit ? 'Setoran modal' : 'Penarikan modal (prive)'} — ${row.ownerName}`,
      reference: row.notes ?? '',
      inIdr: isDeposit ? row.amountIdr : 0,
      outIdr: isDeposit ? 0 : row.amountIdr
    });
  }
  for (const row of purchaseRows) {
    raw.push({
      date: row.purchasedAt,
      description: `Pembelian barang — ${row.supplierName ?? 'supplier'}`,
      reference: row.invoiceNumber ?? row.purchaseNumber,
      inIdr: 0,
      outIdr: row.paidIdr
    });
  }
  for (const row of expenseRows) {
    if (!row.paidAt) continue;
    raw.push({
      date: row.paidAt,
      description: `${EXPENSE_CATEGORY_LABEL[row.category] ?? row.category} — ${row.description}`,
      reference: '',
      inIdr: 0,
      outIdr: row.amountIdr
    });
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = openingBalance;
  const rows: CashBookRow[] = raw.map((row) => {
    balance += row.inIdr - row.outIdr;
    return { ...row, balanceIdr: balance };
  });

  return {
    openingBalance,
    rows,
    totalIn: rows.reduce((sum, r) => sum + r.inIdr, 0),
    totalOut: rows.reduce((sum, r) => sum + r.outIdr, 0),
    closingBalance: balance
  };
}

/**
 * Laporan pemasukan & pengeluaran: dua kolom terpisah seperti formulir cetak
 * bengkel. Sumbernya sama dengan buku kas, hanya penyajiannya yang dipisah.
 */
export async function getIncomeExpenseReport(period: Period) {
  const book = await getCashBook(period);
  return {
    period,
    income: book.rows.filter((r) => r.inIdr > 0).map((r) => ({ ...r, amountIdr: r.inIdr })),
    expense: book.rows.filter((r) => r.outIdr > 0).map((r) => ({ ...r, amountIdr: r.outIdr })),
    totalIncome: book.totalIn,
    totalExpense: book.totalOut,
    netIdr: book.totalIn - book.totalOut
  };
}
