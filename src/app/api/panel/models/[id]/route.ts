import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bodyModels, workOrders } from '@/lib/db/schema';
import { requireAdmin, requireRole } from '@/lib/auth/guards';
import { bodyModelSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, bodyModelSchema);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  try {
    await db
      .update(bodyModels)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(bodyModels.id, id));
  } catch (err) {
    if (/UNIQUE constraint failed/i.test(err instanceof Error ? err.message : String(err))) {
      return NextResponse.json({ error: `Kode model "${parsed.data.code}" sudah dipakai.` }, { status: 409 });
    }
    throw err;
  }
  await logAction(guard.user.id, 'model.update', 'body_model', id, { code: parsed.data.code });

  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  // Model yang pernah dipakai SPK cukup dinonaktifkan, jangan dihapus, supaya
  // SPK lama tetap menunjukkan model apa yang dikerjakan.
  const used = await db.select({ id: workOrders.id }).from(workOrders).where(eq(workOrders.bodyModelId, id)).limit(1);
  if (used.length > 0) {
    return NextResponse.json(
      { error: 'Model ini dipakai oleh SPK yang sudah ada. Nonaktifkan saja agar riwayat tetap utuh.' },
      { status: 409 }
    );
  }

  await db.delete(bodyModels).where(eq(bodyModels.id, id));
  await logAction(guard.user.id, 'model.delete', 'body_model', id);

  return NextResponse.json({ ok: true });
});
