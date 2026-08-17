import { NextRequest, NextResponse } from 'next/server';
import { getDb, getEnv } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';
import { leadCreateSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { newId } from '@/lib/id';
import { UNIT_TYPE_LABEL } from '@/lib/karoseri/constants';

const RATE_LIMIT_PER_HOUR = 5;

/** Endpoint publik: form permintaan penawaran di landing page. */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseBody(req, leadCreateSchema);
  if ('error' in parsed) return parsed.error;

  const env = await getEnv();
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown';

  const allowed = await consumeRateLimit(env, ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan dari koneksi ini. Coba lagi dalam satu jam atau hubungi kami via WhatsApp.' },
      { status: 429 }
    );
  }

  const db = await getDb();
  const id = newId('lead');
  await db.insert(leads).values({ id, ...parsed.data });

  // Notifikasi ke webhook internal bersifat opsional — kegagalannya tidak boleh
  // membuat pelanggan melihat error padahal datanya sudah tersimpan.
  await notify(env, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    unitType: UNIT_TYPE_LABEL[parsed.data.unitType],
    quantity: parsed.data.quantity
  });

  return NextResponse.json({ ok: true, id });
});

async function consumeRateLimit(env: CloudflareEnv, ip: string): Promise<boolean> {
  if (!env.QUANTUM_KV || ip === 'unknown') return true;
  try {
    const key = `lead_rl:${ip}`;
    const current = Number((await env.QUANTUM_KV.get(key)) ?? '0');
    if (current >= RATE_LIMIT_PER_HOUR) return false;
    await env.QUANTUM_KV.put(key, String(current + 1), { expirationTtl: 3600 });
    return true;
  } catch (err) {
    // KV bermasalah tidak boleh memblokir calon pelanggan mengirim permintaan.
    console.error('Rate limit KV error:', err);
    return true;
  }
}

async function notify(env: CloudflareEnv, payload: Record<string, unknown>): Promise<void> {
  if (!env.NOTIFY_WEBHOOK_URL) return;
  try {
    await fetch(env.NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lead.created', ...payload })
    });
  } catch (err) {
    console.error('Gagal mengirim notifikasi lead:', err);
  }
}
