import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { settingsSchema } from '@/lib/validation';
import { parseBody, withErrorHandling } from '@/lib/api-handler';
import { getSettings, saveSettings } from '@/lib/settings';
import { logAction } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async () => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;
  return NextResponse.json({ settings: await getSettings() });
});

/**
 * Hanya admin yang boleh mengubah tarif pajak dan identitas kop laporan —
 * keduanya mengubah angka di seluruh laporan sekaligus.
 */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const guard = await requireAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, settingsSchema);
  if ('error' in parsed) return parsed.error;

  await saveSettings(parsed.data, guard.user.id);
  await logAction(guard.user.id, 'settings.update', 'settings', undefined, parsed.data);

  return NextResponse.json({ ok: true, settings: await getSettings() });
});
