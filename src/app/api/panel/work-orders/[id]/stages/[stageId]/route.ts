import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { stages } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { stageUpdateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { getWorkOrderDetail, syncWorkOrderStatus } from '@/lib/data/work-orders';
import { parseDateInput } from '@/lib/format';
import { logAction } from '@/lib/audit';

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) => {
    const guard = await requireRole('produksi');
    if ('error' in guard) return guard.error;
    const { id, stageId } = await params;

    const parsed = await parseBody(req, stageUpdateSchema);
    if ('error' in parsed) return parsed.error;
    const { status, picName, notes, startedAt, finishedAt } = parsed.data;

    const db = await getDb();
    const rows = await db
      .select()
      .from(stages)
      .where(and(eq(stages.id, stageId), eq(stages.workOrderId, id)))
      .limit(1);
    const stage = rows[0];
    if (!stage) return NextResponse.json({ error: 'Tahapan tidak ditemukan pada SPK ini.' }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (picName !== undefined) updates.picName = picName;
    if (notes !== undefined) updates.notes = notes;
    if (startedAt !== undefined) updates.startedAt = toDate(startedAt);
    if (finishedAt !== undefined) updates.finishedAt = toDate(finishedAt);

    if (status !== undefined) {
      updates.status = status;
      // Tanggal mulai/selesai diisi otomatis saat status berubah, kecuali operator
      // sudah mengisinya sendiri di request yang sama atau sebelumnya.
      if (status === 'in_progress' && startedAt === undefined && !stage.startedAt) {
        updates.startedAt = new Date();
      }
      if (status === 'done' && finishedAt === undefined && !stage.finishedAt) {
        updates.finishedAt = new Date();
        if (!stage.startedAt && startedAt === undefined) updates.startedAt = new Date();
      }
      // Tahapan yang dibuka kembali tidak boleh menyisakan tanggal selesai lama.
      if (status !== 'done' && stage.finishedAt && finishedAt === undefined) {
        updates.finishedAt = null;
      }
    }

    await db.update(stages).set(updates).where(eq(stages.id, stageId));
    await syncWorkOrderStatus(id);
    await logAction(guard.user.id, 'stage.update', 'stage', stageId, { workOrderId: id, status });

    const detail = await getWorkOrderDetail(id);
    return NextResponse.json({ ok: true, detail });
  }
);

function toDate(value: string | null): Date | null {
  const ms = parseDateInput(value);
  return ms === null ? null : new Date(ms);
}
