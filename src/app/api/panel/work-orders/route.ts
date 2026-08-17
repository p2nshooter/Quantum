import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireUser } from '@/lib/auth/guards';
import { workOrderCreateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { createWorkOrder, listWorkOrders } from '@/lib/data/work-orders';
import { parseDateInput } from '@/lib/format';
import { logAction } from '@/lib/audit';
import { JOB_TYPES, WORK_ORDER_STATUSES, type JobType, type WorkOrderStatus } from '@/lib/karoseri/constants';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireUser();
  if ('error' in guard) return guard.error;

  const url = new URL(req.url);
  const statusParam = url.searchParams.getAll('status').filter(isWorkOrderStatus);
  const search = url.searchParams.get('q') ?? undefined;
  const jobTypeParam = url.searchParams.get('jobType');
  const jobType = isJobType(jobTypeParam) ? jobTypeParam : undefined;

  const rows = await listWorkOrders({ jobType, status: statusParam.length ? statusParam : undefined, search });
  return NextResponse.json({ workOrders: rows });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, workOrderCreateSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const created = await createWorkOrder({
    ...input,
    seatCount: input.seatCount ?? null,
    startDate: parseDateInput(input.startDate),
    targetDate: parseDateInput(input.targetDate)
  });

  await logAction(guard.user.id, 'work_order.create', 'work_order', created.id, {
    spkNumber: created.spkNumber,
    jobType: input.jobType
  });

  return NextResponse.json({ ok: true, ...created });
});

function isWorkOrderStatus(value: string): value is WorkOrderStatus {
  return (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}

function isJobType(value: string | null): value is JobType {
  return !!value && (JOB_TYPES as readonly string[]).includes(value);
}
