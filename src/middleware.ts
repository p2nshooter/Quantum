import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

/**
 * Pemeriksaan cepat berbasis keberadaan cookie untuk memantulkan pengunjung
 * anonim lebih awal. Pengecekan sesungguhnya — sesi valid di database dan akun
 * masih aktif — tetap dilakukan di `src/app/panel/layout.tsx` dan di setiap
 * route handler. Ini lapis tambahan, bukan sumber kebenaran.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/panel/:path*']
};
