import { and, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers, items, leads, payments, serviceOrders, stages, workOrders } from '@/lib/db/schema';
import { ACTIVE_STATUSES, SERVICE_OPEN_STATUSES } from '@/lib/karoseri/constants';
import { getReceivables } from './reports';

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
    customerCount,
    openServiceOrders,
    serviceThisMonth,
    lowStockCount
  ] = await Promise.all([
    countWorkOrders(db, inArray(workOrders.status, ACTIVE_STATUSES)),
    countWorkOrders(db, eq(workOrders.status, 'produksi')),
    countWorkOrders(db, and(inArray(workOrders.status, ['selesai', 'diserahkan']), gte(workOrders.completedAt, startOfMonth))),
    // Terlambat: target sudah lewat tapi unit masih di jalur produksi.
    countWorkOrders(db, and(inArray(workOrders.status, ACTIVE_STATUSES), lt(workOrders.targetDate, now))),
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
    getReceivables().then((r) => r.total),
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.status, 'baru'))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(serviceOrders)
      .where(inArray(serviceOrders.status, SERVICE_OPEN_STATUSES))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(serviceOrders)
      .where(and(inArray(serviceOrders.status, ['selesai', 'diambil']), gte(serviceOrders.finishedAt, startOfMonth)))
      .then((r) => r[0]?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(eq(items.kind, 'barang'), eq(items.active, true), sql`${items.stockQty} <= ${items.minStockQty}`))
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
    customerCount,
    openServiceOrders,
    serviceThisMonth,
    lowStockCount
  };
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

async function countWorkOrders(db: Awaited<ReturnType<typeof getDb>>, where: SQL | undefined) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(workOrders)
    .where(where);
  return rows[0]?.count ?? 0;
}
