import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bodyModels } from '@/lib/db/schema';
import { requireRole, requireUser } from '@/lib/auth/guards';
import { bodyModelSchema } from '@/lib/validation';
import { validateData, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { logAction } from '@/lib/audit';
import { BODY_MODEL_PRESETS } from '@/lib/karoseri/constants';

export const GET = withErrorHandling(async () => {
  const guard = await requireUser();
  if ('error' in guard) return guard.error;

  const db = await getDb();
  const rows = await db.select().from(bodyModels).orderBy(asc(bodyModels.code));
  return NextResponse.json({ models: rows });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireRole('produksi');
  if ('error' in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as { preset?: boolean } | null;

  // `{ preset: true }` mengisi katalog dengan model bawaan — sekali klik saat
  // sistem baru dipasang. INSERT OR IGNORE lewat onConflictDoNothing, jadi
  // menekan tombolnya dua kali tidak menggandakan data.
  if (body?.preset === true) {
    const db = await getDb();
    let inserted = 0;
    for (const preset of BODY_MODEL_PRESETS) {
      const result = await db
        .insert(bodyModels)
        .values({ id: newId('mdl'), ...preset })
        .onConflictDoNothing({ target: bodyModels.code });
      // D1 mengembalikan meta.changes; drizzle meneruskannya sebagai `meta`.
      const changes = (result as unknown as { meta?: { changes?: number } })?.meta?.changes ?? 0;
      inserted += changes;
    }
    await logAction(guard.user.id, 'model.preset_import', 'body_model', undefined, { inserted });
    return NextResponse.json({ ok: true, inserted });
  }

  const parsed = validateData(bodyModelSchema, body);
  if ('error' in parsed) return parsed.error;

  const db = await getDb();
  const id = newId('mdl');
  try {
    await db.insert(bodyModels).values({ id, ...parsed.data });
  } catch (err) {
    if (/UNIQUE constraint failed/i.test(err instanceof Error ? err.message : String(err))) {
      return NextResponse.json({ error: `Kode model "${parsed.data.code}" sudah dipakai.` }, { status: 409 });
    }
    throw err;
  }
  await logAction(guard.user.id, 'model.create', 'body_model', id, { code: parsed.data.code });

  return NextResponse.json({ ok: true, id });
});
