import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { capitalEntries } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { withErrorHandling } from '@/lib/api-handler';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const DELETE = withErrorHandling(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const db = await getDb();
  const row = (await db.select().from(capitalEntries).where(eq(capitalEntries.id, id)).limit(1))[0];
  if (!row) return NextResponse.json({ error: 'Catatan modal tidak ditemukan.' }, { status: 404 });

  await db.delete(capitalEntries).where(eq(capitalEntries.id, id));
  // Nominal ikut dicatat karena penghapusan modal menggeser saldo kas di laporan.
  await logAction(guard.user.id, 'capital.delete', 'capital', id, { type: row.type, amountIdr: row.amountIdr });

  return NextResponse.json({ ok: true });
});
