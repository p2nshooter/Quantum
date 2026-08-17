import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bodyModels, customers, expenses, payments, stages, workOrders } from '@/lib/db/schema';
import { newId } from '@/lib/id';
import {
  calcProgressPercent,
  stageTemplateFor,
  type JobType,
  type Priority,
  type UnitType,
  type WorkOrderStatus
} from '@/lib/karoseri/constants';

/** Awalan nomor SPK dibedakan per lini pekerjaan agar mudah dikenali di berkas fisik. */
const NUMBER_PREFIX: Record<JobType, string> = {
  karoseri: 'SPK',
  body_repair: 'BR'
};

/**
 * Nomor SPK berformat `SPK/YYYYMM/NNN` (atau `BR/...` untuk body repair), urut
 * per bulan per lini.
 *
 * Nomor urut diambil dari nomor terbesar yang sudah ada di bulan berjalan, bukan
 * dari jumlah baris — jadi menghapus SPK lama tidak membuat nomor terpakai ulang.
 * Kolom `spk_number` unik, dan pemanggil (createWorkOrder) mencoba ulang bila dua
 * SPK dibuat pada saat bersamaan.
 */
export async function generateSpkNumber(jobType: JobType, offset = 0): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const period = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const prefix = `${NUMBER_PREFIX[jobType]}/${period}/`;

  const rows = await db
    .select({ spkNumber: workOrders.spkNumber })
    .from(workOrders)
    .where(like(workOrders.spkNumber, `${prefix}%`))
    .orderBy(desc(workOrders.spkNumber))
    .limit(1);

  const lastSeq = rows[0] ? Number(rows[0].spkNumber.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1 + offset;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export type CreateWorkOrderInput = {
  jobType: JobType;
  customerId: string;
  bodyModelId: string | null;
  unitType: UnitType;
  chassisBrand: string;
  chassisType: string | null;
  chassisNumber: string;
  engineNumber: string | null;
  policeNumber: string | null;
  color: string | null;
  seatCount: number | null;
  specNotes: string | null;
  insurerName: string | null;
  policyNumber: string | null;
  claimNumber: string | null;
  surveyorName: string | null;
  deductibleIdr: number;
  contractValueIdr: number;
  status: WorkOrderStatus;
  priority: Priority;
  startDate: number | null;
  targetDate: number | null;
};

/**
 * Buat SPK sekaligus daftar tahapan produksinya dari template lini pekerjaan.
 * SPK dan tahapannya ditulis dalam satu `batch` D1 supaya tidak pernah ada SPK
 * "telanjang" tanpa tahapan bila salah satu perintah gagal.
 */
export async function createWorkOrder(input: CreateWorkOrderInput): Promise<{ id: string; spkNumber: string }> {
  const db = await getDb();
  const id = newId('spk');
  const template = stageTemplateFor(input.unitType, input.jobType);

  // Nomor SPK bentrok hanya mungkin bila dua admin menyimpan pada saat bersamaan;
  // unique index yang menolak, lalu kita ambil nomor berikutnya.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const spkNumber = await generateSpkNumber(input.jobType, attempt);
    try {
      await db.batch([
        db.insert(workOrders).values({
          id,
          spkNumber,
          jobType: input.jobType,
          customerId: input.customerId,
          bodyModelId: input.bodyModelId,
          unitType: input.unitType,
          chassisBrand: input.chassisBrand,
          chassisType: input.chassisType,
          chassisNumber: input.chassisNumber,
          engineNumber: input.engineNumber,
          policeNumber: input.policeNumber,
          color: input.color,
          seatCount: input.seatCount,
          specNotes: input.specNotes,
          insurerName: input.insurerName,
          policyNumber: input.policyNumber,
          claimNumber: input.claimNumber,
          surveyorName: input.surveyorName,
          deductibleIdr: input.deductibleIdr,
          contractValueIdr: input.contractValueIdr,
          status: input.status,
          priority: input.priority,
          startDate: input.startDate ? new Date(input.startDate) : null,
          targetDate: input.targetDate ? new Date(input.targetDate) : null
        }),
        db.insert(stages).values(
          template.map((stage, index) => ({
            id: newId('stg'),
            workOrderId: id,
            sortOrder: index + 1,
            name: stage.name,
            weightPercent: stage.weightPercent
          }))
        )
      ]);
      return { id, spkNumber };
    } catch (err) {
      lastError = err;
      if (!isUniqueViolation(err)) throw err;
    }
  }

  throw new Error(
    `Gagal membuat nomor SPK unik setelah beberapa percobaan: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function isUniqueViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}

export type WorkOrderListFilter = {
  jobType?: JobType;
  status?: WorkOrderStatus[];
  search?: string;
  limit?: number;
};

/** Daftar SPK beserta progres produksinya (dihitung di SQL, bukan per baris di app). */
export async function listWorkOrders(filter: WorkOrderListFilter = {}) {
  const db = await getDb();

  const progressExpr = sql<number>`coalesce(round(
    sum(case
      when ${stages.status} = 'done' then ${stages.weightPercent}
      when ${stages.status} = 'in_progress' then ${stages.weightPercent} / 2.0
      else 0 end) * 100.0 /
    nullif(sum(${stages.weightPercent}), 0)
  ), 0)`;

  const conditions = [];
  if (filter.jobType) conditions.push(eq(workOrders.jobType, filter.jobType));
  if (filter.status?.length) conditions.push(inArray(workOrders.status, filter.status));
  if (filter.search?.trim()) {
    const term = `%${filter.search.trim()}%`;
    conditions.push(
      sql`(${workOrders.spkNumber} LIKE ${term} OR ${workOrders.chassisNumber} LIKE ${term} OR ${workOrders.policeNumber} LIKE ${term} OR ${customers.name} LIKE ${term} OR ${customers.company} LIKE ${term})`
    );
  }

  return db
    .select({
      id: workOrders.id,
      spkNumber: workOrders.spkNumber,
      jobType: workOrders.jobType,
      unitType: workOrders.unitType,
      chassisBrand: workOrders.chassisBrand,
      chassisNumber: workOrders.chassisNumber,
      policeNumber: workOrders.policeNumber,
      status: workOrders.status,
      priority: workOrders.priority,
      contractValueIdr: workOrders.contractValueIdr,
      startDate: workOrders.startDate,
      targetDate: workOrders.targetDate,
      createdAt: workOrders.createdAt,
      customerName: customers.name,
      customerCompany: customers.company,
      modelName: bodyModels.name,
      progressPercent: progressExpr
    })
    .from(workOrders)
    .innerJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(bodyModels, eq(workOrders.bodyModelId, bodyModels.id))
    .leftJoin(stages, eq(stages.workOrderId, workOrders.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(workOrders.id)
    .orderBy(desc(workOrders.createdAt))
    .limit(filter.limit ?? 200);
}

export async function getWorkOrderDetail(id: string) {
  const db = await getDb();

  const rows = await db
    .select({
      workOrder: workOrders,
      customer: customers,
      model: bodyModels
    })
    .from(workOrders)
    .innerJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(bodyModels, eq(workOrders.bodyModelId, bodyModels.id))
    .where(eq(workOrders.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [stageRows, paymentRows, materialRows] = await Promise.all([
    db.select().from(stages).where(eq(stages.workOrderId, id)).orderBy(stages.sortOrder),
    db
      .select()
      .from(payments)
      .where(and(eq(payments.refType, 'work_order'), eq(payments.refId, id)))
      .orderBy(desc(payments.paidAt)),
    // Biaya bahan yang dibebankan ke SPK ini — dasar laba kotor per unit.
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amountIdr}), 0)` })
      .from(expenses)
      .where(eq(expenses.workOrderId, id))
  ]);

  const paidTotal = paymentRows.reduce((sum, p) => sum + p.amountIdr, 0);
  const materialCost = materialRows[0]?.total ?? 0;

  return {
    workOrder: row.workOrder,
    customer: row.customer,
    model: row.model,
    stages: stageRows,
    payments: paymentRows,
    progressPercent: calcProgressPercent(stageRows),
    paidTotal,
    outstanding: row.workOrder.contractValueIdr - paidTotal,
    materialCost,
    grossProfit: row.workOrder.contractValueIdr - materialCost
  };
}

/**
 * Hapus SPK beserta seluruh turunannya.
 *
 * Tahapan ikut terhapus lewat ON DELETE CASCADE, tapi pembayaran memakai relasi
 * polimorfik (tanpa foreign key) sehingga harus dihapus manual — kalau tidak,
 * barisnya jadi yatim dan tetap ikut terhitung di laporan kas.
 */
export async function deleteWorkOrderCascade(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(payments).where(and(eq(payments.refType, 'work_order'), eq(payments.refId, id)));
  // Biaya bahan tetap disimpan sebagai catatan keuangan, hanya kaitannya dilepas.
  await db.update(expenses).set({ workOrderId: null }).where(eq(expenses.workOrderId, id));
  await db.delete(workOrders).where(eq(workOrders.id, id));
}

/**
 * Selaraskan status SPK dengan kondisi tahapannya setelah sebuah tahapan diubah.
 *
 * Hanya menaikkan status di jalur produksi normal (antrian → produksi → qc →
 * selesai). Status terminal yang diputuskan manusia — `diserahkan` dan `batal` —
 * tidak pernah ditimpa otomatis, begitu juga SPK yang masih `draft`.
 */
export async function syncWorkOrderStatus(workOrderId: string): Promise<void> {
  const db = await getDb();

  const rows = await db.select().from(workOrders).where(eq(workOrders.id, workOrderId)).limit(1);
  const workOrder = rows[0];
  if (!workOrder) return;
  if (workOrder.status === 'draft' || workOrder.status === 'diserahkan' || workOrder.status === 'batal') return;

  const stageRows = await db
    .select({ status: stages.status, sortOrder: stages.sortOrder })
    .from(stages)
    .where(eq(stages.workOrderId, workOrderId));
  if (stageRows.length === 0) return;

  const allDone = stageRows.every((s) => s.status === 'done');
  const anyStarted = stageRows.some((s) => s.status === 'in_progress' || s.status === 'done');

  // Tahapan terakhir yang belum selesai menandakan unit sedang di fase QC/finishing.
  const lastStageOrder = Math.max(...stageRows.map((s) => s.sortOrder));
  const inFinalStage = stageRows.some((s) => s.sortOrder === lastStageOrder && s.status === 'in_progress');

  let nextStatus = workOrder.status;
  if (allDone) nextStatus = 'selesai';
  else if (inFinalStage) nextStatus = 'qc';
  else if (anyStarted) nextStatus = 'produksi';

  if (nextStatus !== workOrder.status) {
    // `completedAt` dikunci pada saat pertama kali pekerjaan dinyatakan rampung.
    // Kalau SPK dibuka lagi lalu selesai lagi, tanggal awalnya dipertahankan agar
    // pendapatan tidak berpindah bulan di laporan yang sudah dicetak.
    const completedAt =
      nextStatus === 'selesai' && !workOrder.completedAt ? new Date() : workOrder.completedAt;
    await db
      .update(workOrders)
      .set({ status: nextStatus, completedAt, updatedAt: new Date() })
      .where(eq(workOrders.id, workOrderId));
  }
}
