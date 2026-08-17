import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { serviceOrderCreateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { createServiceOrder, listServiceOrders } from '@/lib/data/service-orders';
import { SERVICE_STATUSES, type ServiceStatus } from '@/lib/karoseri/constants';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi', 'keuangan', 'bos');
  if ('error' in guard) return guard.error;

  const url = new URL(req.url);
  // Filter status dikirim sebagai daftar dipisah koma; nilai asing dibuang
  // diam-diam supaya URL yang dimodifikasi tangan tidak membuat query gagal.
  const statusParam = url.searchParams.get('status');
  const status = statusParam
    ? (statusParam.split(',').filter((s): s is ServiceStatus => SERVICE_STATUSES.includes(s as ServiceStatus)))
    : undefined;

  const orders = await listServiceOrders({
    status: status?.length ? status : undefined,
    search: url.searchParams.get('q') ?? undefined
  });

  return NextResponse.json({ orders });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, serviceOrderCreateSchema);
  if ('error' in parsed) return parsed.error;

  const created = await createServiceOrder(parsed.data, guard.user.id);
  await logAction(guard.user.id, 'service_order.create', 'service_order', created.id, {
    orderNumber: created.orderNumber,
    policeNumber: parsed.data.policeNumber
  });

  return NextResponse.json({ ok: true, ...created });
});
