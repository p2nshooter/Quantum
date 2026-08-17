import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers, items, payments, serviceOrderItems, serviceOrders, stockMoves } from '@/lib/db/schema';
import { newId } from '@/lib/id';
import { getSettings } from '@/lib/settings';
import type { ItemKind, ServiceStatus } from '@/lib/karoseri/constants';

export type ServiceOrderLineInput = {
  itemId: string | null;
  name: string;
  kind: ItemKind;
  qty: number;
  unitPriceIdr: number;
  /** Boleh dikirim untuk barang dadakan; kalau kosong diambil dari master item. */
  unitCostIdr?: number;
};

export type CreateServiceOrderInput = {
  customerId: string;
  policeNumber: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  odometerKm: number | null;
  complaint: string | null;
  diagnosis: string | null;
  mechanicName: string | null;
  status: ServiceStatus;
  discountIdr: number;
  notes: string | null;
  lines: ServiceOrderLineInput[];
};

/** Nomor order servis `SRV/YYYYMM/NNN`, urut per bulan. */
export async function generateServiceNumber(offset = 0): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const period = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prefix = `SRV/${period}/`;

  const rows = await db
    .select({ orderNumber: serviceOrders.orderNumber })
    .from(serviceOrders)
    .where(like(serviceOrders.orderNumber, `${prefix}%`))
    .orderBy(desc(serviceOrders.orderNumber))
    .limit(1);

  const lastSeq = rows[0] ? Number(rows[0].orderNumber.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1 + offset;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Hitung nilai order dari baris-barisnya. HPP hanya dihitung dari barang: jasa
 * tidak punya harga modal tersendiri karena upah mekanik sudah masuk biaya
 * operasional bulanan, dan menghitungnya dua kali akan menggandakan beban.
 */
export function calcServiceTotals(
  lines: { kind: ItemKind; qty: number; unitPriceIdr: number; unitCostIdr: number }[],
  discountIdr: number,
  taxPercent: number
) {
  const subtotalIdr = lines.reduce((sum, l) => sum + l.qty * l.unitPriceIdr, 0);
  const cogsIdr = lines.reduce((sum, l) => (l.kind === 'barang' ? sum + l.qty * l.unitCostIdr : sum), 0);
  const afterDiscount = Math.max(0, subtotalIdr - discountIdr);
  const taxIdr = Math.round((afterDiscount * taxPercent) / 100);
  return { subtotalIdr, cogsIdr, taxIdr, totalIdr: afterDiscount + taxIdr };
}

/**
 * Buat order servis beserta barisnya, sekaligus mengurangi stok barang yang
 * dipakai dan mencatatnya di kartu stok.
 */
export async function createServiceOrder(
  input: CreateServiceOrderInput,
  actorUserId: string
): Promise<{ id: string; orderNumber: string }> {
  const db = await getDb();
  const settings = await getSettings();
  const taxPercent = settings.ppnEnabled ? settings.ppnPercent : 0;

  // Harga modal diambil dari master saat transaksi lalu disalin ke baris order,
  // supaya laporan laba lama tidak ikut berubah kalau harga modal naik nanti.
  const masterIds = input.lines.map((l) => l.itemId).filter((v): v is string => !!v);
  const masters = masterIds.length
    ? await db.select().from(items).where(inArray(items.id, masterIds))
    : [];
  const masterMap = new Map(masters.map((m) => [m.id, m]));

  const resolvedLines = input.lines.map((line) => {
    const master = line.itemId ? masterMap.get(line.itemId) : undefined;
    return {
      ...line,
      kind: master?.kind ?? line.kind,
      unitCostIdr: line.unitCostIdr ?? master?.costPriceIdr ?? 0
    };
  });

  const totals = calcServiceTotals(resolvedLines, input.discountIdr, taxPercent);
  const id = newId('srv');
  const now = new Date();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = await generateServiceNumber(attempt);
    try {
      await db.insert(serviceOrders).values({
        id,
        orderNumber,
        customerId: input.customerId,
        policeNumber: input.policeNumber.toUpperCase(),
        vehicleBrand: input.vehicleBrand,
        vehicleModel: input.vehicleModel,
        vehicleYear: input.vehicleYear,
        odometerKm: input.odometerKm,
        complaint: input.complaint,
        diagnosis: input.diagnosis,
        mechanicName: input.mechanicName,
        status: input.status,
        subtotalIdr: totals.subtotalIdr,
        discountIdr: input.discountIdr,
        taxPercent,
        taxIdr: totals.taxIdr,
        totalIdr: totals.totalIdr,
        cogsIdr: totals.cogsIdr,
        checkInAt: now,
        notes: input.notes
      });

      if (resolvedLines.length > 0) {
        await db.insert(serviceOrderItems).values(
          resolvedLines.map((line) => ({
            id: newId('sit'),
            serviceOrderId: id,
            itemId: line.itemId,
            name: line.name,
            kind: line.kind,
            qty: line.qty,
            unitPriceIdr: line.unitPriceIdr,
            unitCostIdr: line.unitCostIdr,
            subtotalIdr: line.qty * line.unitPriceIdr
          }))
        );
      }

      await applyStockForServiceOrder(id, resolvedLines, actorUserId, now);
      return { id, orderNumber };
    } catch (err) {
      lastError = err;
      if (!isUniqueViolation(err)) throw err;
    }
  }

  throw new Error(
    `Gagal membuat nomor order servis unik: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/** Kurangi stok untuk tiap barang yang terpakai dan catat di kartu stok. */
async function applyStockForServiceOrder(
  serviceOrderId: string,
  lines: ServiceOrderLineInput[],
  actorUserId: string,
  movedAt: Date
): Promise<void> {
  const db = await getDb();
  for (const line of lines) {
    if (!line.itemId || line.kind !== 'barang' || line.qty <= 0) continue;
    await db
      .update(items)
      .set({ stockQty: sql`${items.stockQty} - ${line.qty}`, updatedAt: new Date() })
      .where(eq(items.id, line.itemId));
    await db.insert(stockMoves).values({
      id: newId('stk'),
      itemId: line.itemId,
      type: 'keluar',
      qty: line.qty,
      unitCostIdr: line.unitCostIdr ?? 0,
      refType: 'service_order',
      refId: serviceOrderId,
      notes: 'Pemakaian pada order servis',
      movedAt,
      createdBy: actorUserId
    });
  }
}

function isUniqueViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}

export type ServiceOrderFilter = {
  status?: ServiceStatus[];
  search?: string;
  limit?: number;
};

export async function listServiceOrders(filter: ServiceOrderFilter = {}) {
  const db = await getDb();

  const paidExpr = sql<number>`coalesce((
    select sum(${payments.amountIdr}) from ${payments}
    where ${payments.refType} = 'service_order' and ${payments.refId} = ${serviceOrders.id}
  ), 0)`;

  const conditions = [];
  if (filter.status?.length) conditions.push(inArray(serviceOrders.status, filter.status));
  if (filter.search?.trim()) {
    const term = `%${filter.search.trim()}%`;
    conditions.push(
      sql`(${serviceOrders.orderNumber} LIKE ${term} OR ${serviceOrders.policeNumber} LIKE ${term} OR ${customers.name} LIKE ${term} OR ${customers.company} LIKE ${term})`
    );
  }

  return db
    .select({
      id: serviceOrders.id,
      orderNumber: serviceOrders.orderNumber,
      policeNumber: serviceOrders.policeNumber,
      vehicleBrand: serviceOrders.vehicleBrand,
      vehicleModel: serviceOrders.vehicleModel,
      status: serviceOrders.status,
      totalIdr: serviceOrders.totalIdr,
      cogsIdr: serviceOrders.cogsIdr,
      checkInAt: serviceOrders.checkInAt,
      finishedAt: serviceOrders.finishedAt,
      mechanicName: serviceOrders.mechanicName,
      createdAt: serviceOrders.createdAt,
      customerName: customers.name,
      customerCompany: customers.company,
      paidIdr: paidExpr
    })
    .from(serviceOrders)
    .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(serviceOrders.createdAt))
    .limit(filter.limit ?? 200);
}

export async function getServiceOrderDetail(id: string) {
  const db = await getDb();

  const rows = await db
    .select({ order: serviceOrders, customer: customers })
    .from(serviceOrders)
    .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
    .where(eq(serviceOrders.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [lineRows, paymentRows] = await Promise.all([
    db.select().from(serviceOrderItems).where(eq(serviceOrderItems.serviceOrderId, id)),
    db
      .select()
      .from(payments)
      .where(and(eq(payments.refType, 'service_order'), eq(payments.refId, id)))
      .orderBy(desc(payments.paidAt))
  ]);

  const paidTotal = paymentRows.reduce((sum, p) => sum + p.amountIdr, 0);

  return {
    order: row.order,
    customer: row.customer,
    lines: lineRows,
    payments: paymentRows,
    paidTotal,
    outstanding: row.order.totalIdr - paidTotal,
    grossProfit: row.order.totalIdr - row.order.taxIdr - row.order.cogsIdr
  };
}

/**
 * Hapus order servis beserta turunannya. Baris order ikut terhapus lewat
 * cascade, tapi pembayaran (polimorfik, tanpa foreign key) dan pengembalian stok
 * harus ditangani manual.
 */
export async function deleteServiceOrderCascade(id: string, actorUserId: string): Promise<void> {
  const db = await getDb();

  // Barang yang sudah terlanjur dikeluarkan dikembalikan ke stok, dengan jejak
  // kartu stok tersendiri — bukan dengan menghapus riwayat pengeluarannya.
  const lines = await db.select().from(serviceOrderItems).where(eq(serviceOrderItems.serviceOrderId, id));
  for (const line of lines) {
    if (!line.itemId || line.kind !== 'barang' || line.qty <= 0) continue;
    await db
      .update(items)
      .set({ stockQty: sql`${items.stockQty} + ${line.qty}`, updatedAt: new Date() })
      .where(eq(items.id, line.itemId));
    await db.insert(stockMoves).values({
      id: newId('stk'),
      itemId: line.itemId,
      type: 'masuk',
      qty: line.qty,
      unitCostIdr: line.unitCostIdr,
      refType: 'service_order_batal',
      refId: id,
      notes: 'Pengembalian stok karena order servis dihapus',
      movedAt: new Date(),
      createdBy: actorUserId
    });
  }

  await db.delete(payments).where(and(eq(payments.refType, 'service_order'), eq(payments.refId, id)));
  await db.delete(serviceOrders).where(eq(serviceOrders.id, id));
}
