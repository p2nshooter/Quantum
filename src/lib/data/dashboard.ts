import { and, desc, eq, gte, inArray, lt, ne, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers, leads, payments, stages, workOrders } from '@/lib/db/schema';
import { ACTIVE_STATUSES } from '@/lib/karoseri/constants';

/** Ringkasan untuk dashboard panel: beban produksi, keterlambatan, dan uang. */
export async function getDashboardStats() {
  const db = await getDb();
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    activeUnits,
    inProduction,
    finishedThisMonth,
    lateUnits,
    contractActive,
    paidThisMonth,
    receivable,
    newLeads,
    customerCount
  ] = await Promise.all([
    countWhere(db, inArray(workOrders.status, ACTIVE_STATUSES)),
    countWhere(db, eq(workOrders.status, 'produksi')),
    countWhere(
      db,
      and(inArray(workOrders.status, ['selesai', 'diserahkan']), gte(workOrders.updatedAt, startOfMonth))
    ),
    // Terlambat: target sudah lewat tapi unit masih di jalur produksi.
    countWhere(db, and(inArray(workOrders.status, ACTIVE_STATUSES), lt(workOrders.targetDate, now))),
    db
      .select({ sum: sql<number>`coalesce(sum(${workOrders.contractValueIdr}), 0)` })
      .from(workOrders)
      .where(inArray(workOrders.status, ACTIVE_STATUSES))
      .then((r) => r[0]?.sum ?? 0),
    db
      .select({ sum: sql<number>`coalesce(sum(${payments.amountIdr}), 0)` })
      .from(payments)
      .where(gte(payments.paidAt, startOfMonth))
      .then((r) => r[0]?.sum ?? 0),
    getReceivableTotal(),
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.status, 'baru'))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .then((r) => r[0]?.count ?? 0)
  ]);

  return {
    activeUnits,
    inProduction,
    finishedThisMonth,
    lateUnits,
    contractActive,
    paidThisMonth,
    receivable,
    newLeads,
    customerCount
  };
}

/**
 * Total piutang: nilai kontrak seluruh SPK yang belum dibatalkan dikurangi
 * pembayaran yang sudah masuk. Dihitung dengan subquery agar SPK tanpa
 * pembayaran sekalipun tetap terhitung penuh.
 */
export async function getReceivableTotal(): Promise<number> {
  const db = await getDb();
  const paidPerOrder = db
    .select({
      workOrderId: payments.workOrderId,
      paid: sql<number>`sum(${payments.amountIdr})`.as('paid')
    })
    .from(payments)
    .groupBy(payments.workOrderId)
    .as('paid_per_order');

  const rows = await db
    .select({
      sum: sql<number>`coalesce(sum(${workOrders.contractValueIdr} - coalesce(${paidPerOrder.paid}, 0)), 0)`
    })
    .from(workOrders)
    .leftJoin(paidPerOrder, eq(paidPerOrder.workOrderId, workOrders.id))
    .where(ne(workOrders.status, 'batal'));

  return rows[0]?.sum ?? 0;
}

/** Sebaran unit aktif per tahapan — untuk melihat di mana antrian menumpuk. */
export async function getStageWorkload() {
  const db = await getDb();
  return db
    .select({
      name: stages.name,
      count: sql<number>`count(*)`
    })
    .from(stages)
    .innerJoin(workOrders, eq(stages.workOrderId, workOrders.id))
    .where(and(eq(stages.status, 'in_progress'), inArray(workOrders.status, ACTIVE_STATUSES)))
    .groupBy(stages.name)
    .orderBy(desc(sql`count(*)`))
    .limit(12);
}

async function countWhere(db: Awaited<ReturnType<typeof getDb>>, where: SQL | undefined) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(workOrders)
    .where(where);
  return rows[0]?.count ?? 0;
}
