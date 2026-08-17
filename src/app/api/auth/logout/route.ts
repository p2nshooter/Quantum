import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/api-handler';

export const POST = withErrorHandling(async () => {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
});
