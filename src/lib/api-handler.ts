import { NextResponse } from 'next/server';
import type { z } from 'zod';

/**
 * Bungkus route handler supaya throw tak terduga tidak sampai ke browser sebagai
 * body kosong (yang di klien muncul sebagai "Unexpected end of JSON input" dan
 * mustahil didiagnosis dari sisi klien).
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('API route error:', err);
      return NextResponse.json(
        { error: 'Terjadi kesalahan di server. Silakan coba lagi.', detail },
        { status: 500 }
      );
    }
  }) as T;
}

/** Baca JSON body lalu validasi; balikan pesan error pertama yang manusiawi. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<{ data: z.infer<S> } | { error: NextResponse }> {
  const raw = await req.json().catch(() => null);
  return validateData(schema, raw);
}

/**
 * Validasi data yang sudah terlanjur dibaca dari body. Body sebuah Request hanya
 * bisa dibaca sekali, jadi route yang perlu mengintip isinya dulu (mis. untuk
 * membedakan mode request) memakai ini alih-alih memanggil parseBody lagi.
 */
export function validateData<S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown
): { data: z.infer<S> } | { error: NextResponse } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join('.');
    const message = issue?.message ?? 'Data tidak valid.';
    return {
      error: NextResponse.json({ error: field ? `${message} (${field})` : message }, { status: 400 })
    };
  }
  return { data: parsed.data };
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
