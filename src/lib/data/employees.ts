import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { divisions } from '@/lib/db/schema';
import { parseDateInput } from '@/lib/format';

/**
 * Ubah masukan formulir karyawan menjadi baris database.
 *
 * Nama bagian ikut disalin ke kolom `division`, bukan hanya id-nya, supaya slip
 * gaji dan arsip lama tetap terbaca apa adanya walau bagian tersebut nanti
 * diganti nama atau dihapus.
 *
 * Fungsi ini tinggal di lib, bukan di berkas route: Next.js hanya mengizinkan
 * route mengekspor handler HTTP, sehingga helper apa pun di sana akan ditolak
 * saat build.
 */
export async function mapEmployeeInput(data: {
  divisionId: string | null;
  joinDate: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  [key: string]: unknown;
}): Promise<Record<string, unknown>> {
  const db = await getDb();

  let divisionName: string | null = null;
  if (data.divisionId) {
    const row = (await db.select().from(divisions).where(eq(divisions.id, data.divisionId)).limit(1))[0];
    divisionName = row?.name ?? null;
  }

  const toDate = (value: string | null) => {
    const ms = parseDateInput(value);
    return ms === null ? null : new Date(ms);
  };

  const { joinDate, contractStart, contractEnd, ...rest } = data;
  return {
    ...rest,
    division: divisionName,
    joinDate: toDate(joinDate),
    contractStart: toDate(contractStart),
    contractEnd: toDate(contractEnd)
  };
}
