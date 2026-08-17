import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { customers, stages, workOrders } from '@/lib/db/schema';
import { trackSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { calcProgressPercent, UNIT_TYPE_LABEL, WORK_ORDER_STATUS_LABEL } from '@/lib/karoseri/constants';

/**
 * Endpoint publik pelacakan progres unit.
 *
 * Nomor SPK saja tidak cukup (formatnya berurutan dan mudah ditebak), jadi
 * pemanggil harus menyertakan nomor rangka unit yang cocok. Respons pun sengaja
 * hanya berisi progres pengerjaan — tanpa nilai kontrak, pembayaran, maupun
 * kontak pelanggan.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseBody(req, trackSchema);
  if ('error' in parsed) return parsed.error;

  const spkNumber = parsed.data.spkNumber.toUpperCase();
  const chassisNumber = parsed.data.chassisNumber;

  const db = await getDb();
  const rows = await db
    .select({
      id: workOrders.id,
      spkNumber: workOrders.spkNumber,
      unitType: workOrders.unitType,
      chassisBrand: workOrders.chassisBrand,
      chassisType: workOrders.chassisType,
      status: workOrders.status,
      startDate: workOrders.startDate,
      targetDate: workOrders.targetDate,
      deliveredAt: workOrders.deliveredAt,
      customerName: customers.name,
      customerCompany: customers.company
    })
    .from(workOrders)
    .innerJoin(customers, eq(workOrders.customerId, customers.id))
    .where(
      and(
        eq(workOrders.spkNumber, spkNumber),
        // Nomor rangka dicocokkan tanpa membedakan huruf besar/kecil, karena
        // pelanggan biasanya menyalinnya dari STNK atau faktur.
        sql`upper(${workOrders.chassisNumber}) = upper(${chassisNumber})`
      )
    )
    .limit(1);

  const workOrder = rows[0];
  if (!workOrder) {
    return NextResponse.json(
      { error: 'Data tidak ditemukan. Pastikan nomor SPK dan nomor rangka sesuai dengan surat perjanjian Anda.' },
      { status: 404 }
    );
  }

  const stageRows = await db
    .select({
      name: stages.name,
      status: stages.status,
      weightPercent: stages.weightPercent,
      sortOrder: stages.sortOrder,
      startedAt: stages.startedAt,
      finishedAt: stages.finishedAt
    })
    .from(stages)
    .where(eq(stages.workOrderId, workOrder.id))
    .orderBy(stages.sortOrder);

  return NextResponse.json({
    spkNumber: workOrder.spkNumber,
    unitTypeLabel: UNIT_TYPE_LABEL[workOrder.unitType],
    chassis: [workOrder.chassisBrand, workOrder.chassisType].filter(Boolean).join(' '),
    statusLabel: WORK_ORDER_STATUS_LABEL[workOrder.status],
    customerName: workOrder.customerCompany || workOrder.customerName,
    startDate: workOrder.startDate,
    targetDate: workOrder.targetDate,
    deliveredAt: workOrder.deliveredAt,
    progressPercent: calcProgressPercent(stageRows),
    stages: stageRows
  });
});
