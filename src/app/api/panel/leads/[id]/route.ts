import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { leadUpdateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('produksi', 'keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const parsed = await parseBody(req, leadUpdateSchema);
  if ('error' in parsed) return parsed.error;

  const updates: Record<string, unknown> = { updatedAt: new Date(), handledBy: guard.user.id };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.internalNotes !== undefined) updates.internalNotes = parsed.data.internalNotes;

  const db = await getDb();
  await db.update(leads).set(updates).where(eq(leads.id, id));
  await logAction(guard.user.id, 'lead.update', 'lead', id, parsed.data);

  return NextResponse.json({ ok: true });
});
