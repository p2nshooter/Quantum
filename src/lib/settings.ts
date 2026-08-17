import { eq, inArray } from 'drizzle-orm';
import { PPH_BASES, type PphBase } from '@/lib/karoseri/constants';
import { getDb } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';

/**
 * Setelan yang bisa diubah admin lewat panel tanpa perlu deploy ulang.
 * Nilai disimpan sebagai teks di tabel `settings`; helper di bawah yang
 * mengubahnya ke angka/boolean sekaligus menyediakan nilai bawaan.
 */
export const SETTING_KEYS = {
  ppnEnabled: 'ppn_enabled',
  ppnPercent: 'ppn_percent',
  pphEnabled: 'pph_enabled',
  pphPercent: 'pph_percent',
  pphBase: 'pph_base',
  reportCompanyName: 'report_company_name',
  reportNpwp: 'report_npwp',
  reportAddress: 'report_address',
  reportFooterNote: 'report_footer_note',
  openingCashIdr: 'opening_cash_idr'
} as const;

export type AppSettings = {
  /** PPN dikenakan pada order servis saat dibuat. */
  ppnEnabled: boolean;
  ppnPercent: number;
  /** PPh dihitung otomatis di laporan laba rugi. */
  pphEnabled: boolean;
  pphPercent: number;
  /**
   * Dasar pengenaan PPh. `omzet` sesuai skema PPh final UMKM (peredaran bruto),
   * `laba` untuk PPh badan yang dihitung dari laba usaha.
   */
  pphBase: PphBase;
  reportCompanyName: string;
  reportNpwp: string;
  reportAddress: string;
  reportFooterNote: string;
  /** Saldo kas awal sebelum sistem ini dipakai, agar laporan arus kas nyambung. */
  openingCashIdr: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  ppnEnabled: false,
  ppnPercent: 11,
  pphEnabled: false,
  pphPercent: 0.5,
  pphBase: 'omzet',
  reportCompanyName: 'CV. Quantum Karya Bersama',
  reportNpwp: '',
  reportAddress: 'Kp. Tenjo Laut No. 1, RT 01/01, Desa Sukakarya, Kec. Sukakarya, Kabupaten Bekasi',
  reportFooterNote: 'Laporan ini dihasilkan otomatis oleh sistem internal bengkel.',
  openingCashIdr: 0
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(SETTING_KEYS)));

  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    ppnEnabled: readBool(map, SETTING_KEYS.ppnEnabled, DEFAULT_SETTINGS.ppnEnabled),
    ppnPercent: readNumber(map, SETTING_KEYS.ppnPercent, DEFAULT_SETTINGS.ppnPercent),
    pphEnabled: readBool(map, SETTING_KEYS.pphEnabled, DEFAULT_SETTINGS.pphEnabled),
    pphPercent: readNumber(map, SETTING_KEYS.pphPercent, DEFAULT_SETTINGS.pphPercent),
    pphBase: readPphBase(map),
    reportCompanyName: map.get(SETTING_KEYS.reportCompanyName) ?? DEFAULT_SETTINGS.reportCompanyName,
    reportNpwp: map.get(SETTING_KEYS.reportNpwp) ?? DEFAULT_SETTINGS.reportNpwp,
    reportAddress: map.get(SETTING_KEYS.reportAddress) ?? DEFAULT_SETTINGS.reportAddress,
    reportFooterNote: map.get(SETTING_KEYS.reportFooterNote) ?? DEFAULT_SETTINGS.reportFooterNote,
    openingCashIdr: Math.round(readNumber(map, SETTING_KEYS.openingCashIdr, DEFAULT_SETTINGS.openingCashIdr))
  };
}

export async function saveSettings(patch: Partial<AppSettings>, actorUserId: string): Promise<void> {
  const db = await getDb();
  const entries: { key: string; value: string }[] = [];

  for (const [name, value] of Object.entries(patch)) {
    const key = SETTING_KEYS[name as keyof typeof SETTING_KEYS];
    if (!key || value === undefined) continue;
    entries.push({ key, value: typeof value === 'boolean' ? (value ? '1' : '0') : String(value) });
  }

  for (const entry of entries) {
    await db
      .insert(settings)
      .values({ ...entry, updatedBy: actorUserId, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: entry.value, updatedBy: actorUserId, updatedAt: new Date() }
      });
  }
}

/** Hapus satu setelan agar kembali memakai nilai bawaan. */
export async function resetSetting(key: keyof typeof SETTING_KEYS): Promise<void> {
  const db = await getDb();
  await db.delete(settings).where(eq(settings.key, SETTING_KEYS[key]));
}

function readPphBase(map: Map<string, string>): PphBase {
  const raw = map.get(SETTING_KEYS.pphBase);
  return (PPH_BASES as readonly string[]).includes(raw ?? '') ? (raw as PphBase) : DEFAULT_SETTINGS.pphBase;
}

function readNumber(map: Map<string, string>, key: string, fallback: number): number {
  const raw = map.get(key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBool(map: Map<string, string>, key: string, fallback: boolean): boolean {
  const raw = map.get(key);
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}
