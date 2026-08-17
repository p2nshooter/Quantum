import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { divisions } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth/guards';
import { divisionSchema } from '@/lib/validation';
import { validateData, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';
import { DIVISION_PRESETS } from '@/lib/karoseri/constants';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const guard = await requireRole('keuangan', 'bos', 'produksi');
  if ('error' in guard) return guard.error;

  const db = await getDb();
  return NextResponse.json({ divisions: await db.select().from(divisions).orderBy(asc(divisions.name)) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('keuangan');
  if ('error' in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as { preset?: boolean } | null;

  // `{ preset: true }` mengisi bagian bawaan bengkel sekali klik saat master
  // masih kosong. Nama bagian unik, jadi menekan dua kali tidak menggandakan.
  if (body?.preset === true) {
    const db = await getDb();
    for (const preset of DIVISION_PRESETS) {
      await db
        .insert(divisions)
        .values({ id: newId('div'), ...preset })
        .onConflictDoNothing({ target: divisions.name });
    }
    await logAction(guard.user.id, 'division.preset_import', 'division');
    return NextResponse.json({ ok: true });
  }

  const parsed = validateData(divisionSchema, body);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const id = newId('div');
  try {
    await db.insert(divisions).values({ id, ...parsed.data });
  } catch (err) {
    if (/UNIQUE constraint failed/i.test(err instanceof Error ? err.message : String(err))) {
      return NextResponse.json({ error: `Bagian "${parsed.data.name}" sudah ada.` }, { status: 409 });
    }
    throw err;
  }
  await logAction(guard.user.id, 'division.create', 'division', id, { name: parsed.data.name });

  return NextResponse.json({ ok: true, id });
});
