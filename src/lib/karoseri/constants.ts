/**
 * Domain bengkel: tipe unit, status pekerjaan, template tahapan produksi, serta
 * enum keuangan (kategori biaya, metode bayar, dsb).
 *
 * File ini sengaja bebas dependency (tidak mengimpor drizzle/next) supaya aman
 * dipakai dari server component, route handler, maupun client component.
 */

/* --- Pekerjaan bengkel --------------------------------------------------- */

/** Dua lini pekerjaan yang dikelola lewat SPK bertahap. */
export const JOB_TYPES = ['karoseri', 'body_repair'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  karoseri: 'Karoseri',
  body_repair: 'Body Repair'
};

export const UNIT_TYPES = [
  'bus_besar',
  'bus_medium',
  'microbus',
  'truck_box',
  'wingbox',
  'dump',
  'tangki',
  'mobil_penumpang',
  'custom'
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  bus_besar: 'Bus Besar',
  bus_medium: 'Bus Medium',
  microbus: 'Microbus',
  truck_box: 'Truck Box',
  wingbox: 'Wingbox',
  dump: 'Dump Truck',
  tangki: 'Tangki',
  mobil_penumpang: 'Mobil Penumpang',
  custom: 'Custom / Lainnya'
};

export const WORK_ORDER_STATUSES = [
  'draft',
  'antrian',
  'produksi',
  'qc',
  'selesai',
  'diserahkan',
  'batal'
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  draft: 'Draft',
  antrian: 'Antrian',
  produksi: 'Produksi',
  qc: 'QC / Uji',
  selesai: 'Selesai',
  diserahkan: 'Diserahkan',
  batal: 'Batal'
};

/** Status yang berarti unit masih menempati slot produksi di bengkel. */
export const ACTIVE_STATUSES: WorkOrderStatus[] = ['antrian', 'produksi', 'qc'];

/** Status yang berarti pekerjaan sudah rampung — dipakai sebagai titik akui pendapatan. */
export const COMPLETED_STATUSES: WorkOrderStatus[] = ['selesai', 'diserahkan'];

export const PRIORITIES = ['normal', 'tinggi', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  normal: 'Normal',
  tinggi: 'Tinggi',
  urgent: 'Urgent'
};

export const STAGE_STATUSES = ['pending', 'in_progress', 'done', 'blocked'] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  pending: 'Belum mulai',
  in_progress: 'Dikerjakan',
  done: 'Selesai',
  blocked: 'Terkendala'
};

/* --- Order servis harian ------------------------------------------------- */

export const SERVICE_STATUSES = [
  'antrian',
  'dikerjakan',
  'menunggu_part',
  'selesai',
  'diambil',
  'batal'
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  antrian: 'Antrian',
  dikerjakan: 'Dikerjakan',
  menunggu_part: 'Menunggu Part',
  selesai: 'Selesai',
  diambil: 'Sudah Diambil',
  batal: 'Batal'
};

/** Order servis yang masih memakan kapasitas bengkel. */
export const SERVICE_OPEN_STATUSES: ServiceStatus[] = ['antrian', 'dikerjakan', 'menunggu_part'];

/** Order servis yang pendapatannya sudah boleh diakui. */
export const SERVICE_DONE_STATUSES: ServiceStatus[] = ['selesai', 'diambil'];

/* --- Barang & jasa ------------------------------------------------------- */

export const ITEM_KINDS = ['barang', 'jasa'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  barang: 'Barang / Sparepart',
  jasa: 'Jasa'
};

export const STOCK_MOVE_TYPES = ['masuk', 'keluar', 'penyesuaian'] as const;
export type StockMoveType = (typeof STOCK_MOVE_TYPES)[number];

export const STOCK_MOVE_TYPE_LABEL: Record<StockMoveType, string> = {
  masuk: 'Barang Masuk',
  keluar: 'Barang Keluar',
  penyesuaian: 'Penyesuaian Stok'
};

/* --- Keuangan ------------------------------------------------------------ */

export const PAYMENT_METHODS = ['transfer', 'tunai', 'cek', 'giro', 'qris', 'lainnya'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'Transfer Bank',
  tunai: 'Tunai',
  cek: 'Cek',
  giro: 'Giro',
  qris: 'QRIS',
  lainnya: 'Lainnya'
};

/** Sumber pembayaran — satu tabel pembayaran melayani SPK maupun order servis. */
export const PAYMENT_REF_TYPES = ['work_order', 'service_order'] as const;
export type PaymentRefType = (typeof PAYMENT_REF_TYPES)[number];

/**
 * Kategori biaya. `bahan_produksi` diperlakukan sebagai Harga Pokok Penjualan di
 * laporan laba rugi, sisanya masuk biaya operasional.
 */
export const EXPENSE_CATEGORIES = [
  'bahan_produksi',
  'gaji_upah',
  'sewa_tempat',
  'listrik_air',
  'peralatan',
  'transport',
  'perizinan_pajak',
  'pemasaran',
  'lainnya'
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  bahan_produksi: 'Bahan & Material Produksi',
  gaji_upah: 'Gaji & Upah',
  sewa_tempat: 'Sewa Tempat',
  listrik_air: 'Listrik, Air & Internet',
  peralatan: 'Peralatan & Perawatan',
  transport: 'Transport & BBM',
  perizinan_pajak: 'Perizinan & Pajak',
  pemasaran: 'Pemasaran',
  lainnya: 'Lain-lain'
};

/** Biaya yang dihitung sebagai HPP, bukan biaya operasional. */
export const COGS_EXPENSE_CATEGORIES: ExpenseCategory[] = ['bahan_produksi'];

/** Dasar pengenaan PPh yang dipakai laporan laba rugi. */
export const PPH_BASES = ['omzet', 'laba'] as const;
export type PphBase = (typeof PPH_BASES)[number];

export const PPH_BASE_LABEL: Record<PphBase, string> = {
  omzet: 'PPh final dari omzet (peredaran bruto)',
  laba: 'PPh dari laba usaha'
};

export const CAPITAL_TYPES = ['setoran', 'penarikan'] as const;
export type CapitalType = (typeof CAPITAL_TYPES)[number];

export const CAPITAL_TYPE_LABEL: Record<CapitalType, string> = {
  setoran: 'Setoran Modal',
  penarikan: 'Penarikan / Prive'
};

/* --- Kepegawaian --------------------------------------------------------- */

export const EMPLOYMENT_TYPES = ['tetap', 'kontrak', 'harian', 'borongan', 'magang'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  tetap: 'Karyawan Tetap',
  kontrak: 'Kontrak (PKWT)',
  harian: 'Harian Lepas',
  borongan: 'Borongan',
  magang: 'Magang'
};

/** Upah borongan dan harian tidak terikat gaji bulanan tetap. */
export const MONTHLY_SALARY_TYPES: EmploymentType[] = ['tetap', 'kontrak'];

export const EMPLOYEE_STATUSES = ['aktif', 'cuti', 'nonaktif'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  aktif: 'Aktif',
  cuti: 'Cuti',
  nonaktif: 'Nonaktif / Keluar'
};

/** Bagian bawaan bengkel, dipakai saat master bagian masih kosong. */
export const DIVISION_PRESETS = [
  { name: 'Karoseri', description: 'Rangka, plat bodi, dan perakitan unit.' },
  { name: 'Body Repair', description: 'Ketok, dempul, dan perbaikan panel.' },
  { name: 'Pengecatan', description: 'Epoxy, cat, poles, dan finishing.' },
  { name: 'Servis Mesin', description: 'Tune up, ganti oli, turun mesin.' },
  { name: 'Kelistrikan & AC', description: 'Instalasi kabel, lampu, dan AC.' },
  { name: 'Keuangan & Administrasi', description: 'Kasir, pembukuan, dan arsip.' }
];

/* --- Penggajian ---------------------------------------------------------- */

/**
 * Komponen slip gaji. Semuanya opsional — admin mencentang mana yang dipakai
 * untuk tiap karyawan, dan yang tidak dicentang tidak ikut tercetak di slip.
 * `calcHint` mengisi kolom "Perhitungan" pada formulir cetak.
 */
export type PayrollComponentDef = { key: string; label: string; calcHint?: string };

export const PAYROLL_EARNINGS: PayrollComponentDef[] = [
  { key: 'gaji_pokok', label: 'Gaji Pokok' },
  { key: 'tunjangan_jabatan', label: 'Tunjangan Jabatan' },
  { key: 'tunjangan_kehadiran', label: 'Tunjangan Kehadiran' },
  { key: 'tunjangan_transport', label: 'Tunjangan Transport' },
  { key: 'lembur', label: 'Lembur', calcHint: 'jam x tarif' },
  { key: 'bonus', label: 'Bonus / Prestasi' },
  { key: 'penghasilan_lain', label: 'Lain-lain' }
];

export const PAYROLL_DEDUCTIONS: PayrollComponentDef[] = [
  { key: 'absensi', label: 'Potongan Absensi / Telat' },
  { key: 'bpjs_kesehatan', label: 'Iuran BPJS Kesehatan' },
  { key: 'bpjs_ketenagakerjaan', label: 'Iuran BPJS Ketenagakerjaan' },
  { key: 'pinjaman', label: 'Pinjaman / Cicilan' },
  { key: 'potongan_lain', label: 'Lain-lain' }
];

export const PAYROLL_COMPONENT_TYPES = ['penghasilan', 'potongan'] as const;
export type PayrollComponentType = (typeof PAYROLL_COMPONENT_TYPES)[number];

/* --- Pemasaran ----------------------------------------------------------- */

export const LEAD_STATUSES = ['baru', 'diproses', 'penawaran', 'deal', 'batal'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  penawaran: 'Penawaran Terkirim',
  deal: 'Deal',
  batal: 'Batal'
};

export const PROMO_KINDS = ['promo', 'event', 'pengumuman'] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];

export const PROMO_KIND_LABEL: Record<PromoKind, string> = {
  promo: 'Promo',
  event: 'Event',
  pengumuman: 'Pengumuman'
};

/* --- Pengguna ------------------------------------------------------------ */

export const USER_ROLES = ['admin', 'produksi', 'keuangan', 'bos'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrator',
  produksi: 'Kepala Produksi',
  keuangan: 'Keuangan',
  bos: 'Pemilik / Direktur'
};

export const USER_ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: 'Akses penuh: seluruh data, pengguna, pengaturan, dan laporan.',
  produksi: 'SPK, tahapan produksi, order servis, master data. Tidak melihat laporan keuangan.',
  keuangan: 'Pembayaran, pembelian, biaya, modal, dan seluruh laporan keuangan.',
  bos: 'Hanya membaca laporan. Tidak bisa mengubah data apa pun.'
};

/** Peran yang boleh membuka menu laporan keuangan. */
export const REPORT_ROLES: UserRole[] = ['admin', 'keuangan', 'bos'];

/* --- Template tahapan ---------------------------------------------------- */

export type StageTemplate = { name: string; weightPercent: number };

/**
 * Tahapan baku per tipe unit. Bobot tiap template dijumlahkan tepat 100 supaya
 * progres SPK bisa dibaca langsung sebagai persentase pekerjaan.
 */
const BUS_STAGES: StageTemplate[] = [
  { name: 'Persiapan & Cek Chassis', weightPercent: 5 },
  { name: 'Pembuatan Rangka Bodi', weightPercent: 15 },
  { name: 'Pemasangan Plat Bodi', weightPercent: 12 },
  { name: 'Dempul & Epoxy', weightPercent: 10 },
  { name: 'Pengecatan & Striping', weightPercent: 12 },
  { name: 'Instalasi Kelistrikan', weightPercent: 8 },
  { name: 'Pemasangan Kaca & Pintu', weightPercent: 7 },
  { name: 'Interior, Plafon & Jok', weightPercent: 15 },
  { name: 'AC, Audio & Aksesoris', weightPercent: 8 },
  { name: 'QC & Uji Jalan', weightPercent: 5 },
  { name: 'Finishing & Serah Terima', weightPercent: 3 }
];

const TRUCK_BOX_STAGES: StageTemplate[] = [
  { name: 'Persiapan & Cek Chassis', weightPercent: 6 },
  { name: 'Sub-frame & Dudukan Bak', weightPercent: 10 },
  { name: 'Rangka Box', weightPercent: 18 },
  { name: 'Panel Dinding & Lantai', weightPercent: 16 },
  { name: 'Dempul & Epoxy', weightPercent: 10 },
  { name: 'Pengecatan & Branding', weightPercent: 14 },
  { name: 'Kelistrikan & Lampu', weightPercent: 8 },
  { name: 'Pintu, Kunci & Aksesoris', weightPercent: 10 },
  { name: 'QC & Uji Beban', weightPercent: 5 },
  { name: 'Finishing & Serah Terima', weightPercent: 3 }
];

const WINGBOX_STAGES: StageTemplate[] = [
  { name: 'Persiapan & Cek Chassis', weightPercent: 6 },
  { name: 'Sub-frame & Dudukan', weightPercent: 9 },
  { name: 'Rangka Bak Wing', weightPercent: 16 },
  { name: 'Panel & Lantai', weightPercent: 14 },
  { name: 'Sistem Hidrolik Wing', weightPercent: 12 },
  { name: 'Dempul & Epoxy', weightPercent: 8 },
  { name: 'Pengecatan & Branding', weightPercent: 12 },
  { name: 'Kelistrikan & Lampu', weightPercent: 8 },
  { name: 'Kunci, Seal & Aksesoris', weightPercent: 7 },
  { name: 'QC & Uji Fungsi Wing', weightPercent: 5 },
  { name: 'Finishing & Serah Terima', weightPercent: 3 }
];

const DUMP_STAGES: StageTemplate[] = [
  { name: 'Persiapan & Cek Chassis', weightPercent: 6 },
  { name: 'Sub-frame & Dudukan Dump', weightPercent: 12 },
  { name: 'Rangka & Plat Bak Dump', weightPercent: 20 },
  { name: 'Instalasi Hidrolik & PTO', weightPercent: 16 },
  { name: 'Dempul & Epoxy', weightPercent: 8 },
  { name: 'Pengecatan', weightPercent: 12 },
  { name: 'Kelistrikan & Lampu', weightPercent: 7 },
  { name: 'Pintu Belakang, Terpal & Aksesoris', weightPercent: 8 },
  { name: 'QC & Uji Angkat', weightPercent: 6 },
  { name: 'Finishing & Serah Terima', weightPercent: 5 }
];

const TANGKI_STAGES: StageTemplate[] = [
  { name: 'Persiapan & Cek Chassis', weightPercent: 6 },
  { name: 'Sub-frame & Dudukan Tangki', weightPercent: 10 },
  { name: 'Rolling & Pengelasan Shell', weightPercent: 20 },
  { name: 'Sekat, Manhole & Perpipaan', weightPercent: 14 },
  { name: 'Uji Kebocoran & Kalibrasi', weightPercent: 10 },
  { name: 'Dempul & Epoxy', weightPercent: 7 },
  { name: 'Pengecatan & Marking', weightPercent: 12 },
  { name: 'Kelistrikan, Grounding & APAR', weightPercent: 8 },
  { name: 'QC & Kelengkapan Sertifikasi', weightPercent: 8 },
  { name: 'Finishing & Serah Terima', weightPercent: 5 }
];

const CUSTOM_STAGES: StageTemplate[] = [
  { name: 'Persiapan & Cek Chassis', weightPercent: 10 },
  { name: 'Pembuatan Rangka', weightPercent: 20 },
  { name: 'Panel & Bodi', weightPercent: 20 },
  { name: 'Dempul & Epoxy', weightPercent: 10 },
  { name: 'Pengecatan', weightPercent: 15 },
  { name: 'Kelistrikan', weightPercent: 10 },
  { name: 'Finishing & Aksesoris', weightPercent: 8 },
  { name: 'QC & Serah Terima', weightPercent: 7 }
];

/**
 * Body repair jauh lebih pendek dari karoseri: tidak ada pembuatan rangka baru,
 * fokusnya perbaikan panel, pengecatan, dan pemasangan kembali.
 */
const BODY_REPAIR_STAGES: StageTemplate[] = [
  { name: 'Cek Awal & Foto Kerusakan', weightPercent: 5 },
  { name: 'Bongkar Panel & Aksesoris', weightPercent: 10 },
  { name: 'Ketok & Perbaikan Panel', weightPercent: 20 },
  { name: 'Dempul & Pengamplasan', weightPercent: 15 },
  { name: 'Epoxy & Primer', weightPercent: 10 },
  { name: 'Pengecatan & Pencocokan Warna', weightPercent: 18 },
  { name: 'Poles & Finishing', weightPercent: 10 },
  { name: 'Pasang Kembali & QC', weightPercent: 8 },
  { name: 'Serah Terima', weightPercent: 4 }
];

export const STAGE_TEMPLATES: Record<UnitType, StageTemplate[]> = {
  bus_besar: BUS_STAGES,
  bus_medium: BUS_STAGES,
  microbus: BUS_STAGES,
  truck_box: TRUCK_BOX_STAGES,
  wingbox: WINGBOX_STAGES,
  dump: DUMP_STAGES,
  tangki: TANGKI_STAGES,
  mobil_penumpang: CUSTOM_STAGES,
  custom: CUSTOM_STAGES
};

/**
 * Tahapan ditentukan lini pekerjaannya dulu: apa pun tipe kendaraannya,
 * pekerjaan body repair memakai alur perbaikan, bukan alur pembuatan bodi.
 */
export function stageTemplateFor(unitType: UnitType, jobType: JobType = 'karoseri'): StageTemplate[] {
  if (jobType === 'body_repair') return BODY_REPAIR_STAGES;
  return STAGE_TEMPLATES[unitType] ?? CUSTOM_STAGES;
}

/**
 * Progres SPK dihitung dari bobot tahapan: `done` dihitung penuh, `in_progress`
 * setengah bobot (supaya unit yang sedang dikerjakan tidak terlihat sama dengan
 * yang belum disentuh), `pending`/`blocked` tidak dihitung.
 */
export function calcProgressPercent(stages: { status: StageStatus; weightPercent: number }[]): number {
  const totalWeight = stages.reduce((sum, s) => sum + s.weightPercent, 0);
  if (totalWeight <= 0) return 0;
  const earned = stages.reduce((sum, s) => {
    if (s.status === 'done') return sum + s.weightPercent;
    if (s.status === 'in_progress') return sum + s.weightPercent / 2;
    return sum;
  }, 0);
  return Math.round((earned / totalWeight) * 100);
}

/** Preset model bodi awal supaya master data tidak kosong saat sistem pertama dipakai. */
export const BODY_MODEL_PRESETS: {
  code: string;
  name: string;
  unitType: UnitType;
  description: string;
  basePriceIdr: number;
  estimatedDays: number;
}[] = [
  {
    code: 'BUS-HD-59',
    name: 'Bus Besar High Deck 59 Seat',
    unitType: 'bus_besar',
    description: 'Bodi bus besar high deck, konfigurasi 59 kursi, AC, bagasi bawah.',
    basePriceIdr: 480_000_000,
    estimatedDays: 45
  },
  {
    code: 'BUS-SHD-50',
    name: 'Bus Besar Super High Deck 50 Seat',
    unitType: 'bus_besar',
    description: 'Bodi super high deck dengan bagasi tinggi, toilet, dan interior eksekutif.',
    basePriceIdr: 560_000_000,
    estimatedDays: 55
  },
  {
    code: 'BUS-MED-31',
    name: 'Bus Medium 31 Seat',
    unitType: 'bus_medium',
    description: 'Bodi bus medium untuk chassis 6 ban, 31 kursi, AC.',
    basePriceIdr: 320_000_000,
    estimatedDays: 35
  },
  {
    code: 'MICRO-19',
    name: 'Microbus 19 Seat',
    unitType: 'microbus',
    description: 'Konversi microbus 19 kursi untuk antar-jemput karyawan dan pariwisata.',
    basePriceIdr: 180_000_000,
    estimatedDays: 25
  },
  {
    code: 'BOX-STD-6',
    name: 'Box Besi Standar 6 Ban',
    unitType: 'truck_box',
    description: 'Box besi standar dengan pintu belakang dua daun.',
    basePriceIdr: 65_000_000,
    estimatedDays: 12
  },
  {
    code: 'BOX-ALU-CDD',
    name: 'Box Aluminium Berpendingin',
    unitType: 'truck_box',
    description: 'Box aluminium insulated dengan unit pendingin untuk rantai dingin.',
    basePriceIdr: 150_000_000,
    estimatedDays: 20
  },
  {
    code: 'WING-40',
    name: 'Wingbox 40 Feet',
    unitType: 'wingbox',
    description: 'Bak wingbox 40 kaki dengan sistem hidrolik dua sisi.',
    basePriceIdr: 320_000_000,
    estimatedDays: 30
  },
  {
    code: 'DUMP-8M3',
    name: 'Dump Truck 8 Kubik',
    unitType: 'dump',
    description: 'Bak dump 8 m³ dengan hidrolik front telescopic dan PTO.',
    basePriceIdr: 95_000_000,
    estimatedDays: 18
  },
  {
    code: 'TANK-16KL',
    name: 'Tangki BBM 16.000 Liter',
    unitType: 'tangki',
    description: 'Tangki BBM 4 sekat lengkap dengan perpipaan, grounding, dan APAR.',
    basePriceIdr: 260_000_000,
    estimatedDays: 30
  }
];

/** Preset jasa servis & body repair agar daftar harga tidak kosong saat awal dipakai. */
export const ITEM_PRESETS: {
  code: string;
  name: string;
  kind: ItemKind;
  unit: string;
  costPriceIdr: number;
  sellPriceIdr: number;
  showOnLanding: boolean;
}[] = [
  { code: 'JS-OLI', name: 'Jasa Ganti Oli', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 75_000, showOnLanding: true },
  { code: 'JS-TUNEUP', name: 'Tune Up Mesin', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 350_000, showOnLanding: true },
  { code: 'JS-REM', name: 'Servis Rem & Kaki-Kaki', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 250_000, showOnLanding: true },
  { code: 'JS-AC', name: 'Servis AC Mobil', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 400_000, showOnLanding: true },
  { code: 'JS-SCAN', name: 'Scanner / Diagnosa Komputer', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 150_000, showOnLanding: true },
  { code: 'JS-TURUN', name: 'Turun Mesin (Overhaul)', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 3_500_000, showOnLanding: false },
  { code: 'JS-CAT-PANEL', name: 'Cat Ulang per Panel', kind: 'jasa', unit: 'panel', costPriceIdr: 0, sellPriceIdr: 450_000, showOnLanding: true },
  { code: 'JS-POLES', name: 'Poles Body Full', kind: 'jasa', unit: 'unit', costPriceIdr: 0, sellPriceIdr: 600_000, showOnLanding: true },
  { code: 'BR-OLI-4L', name: 'Oli Mesin 4 Liter', kind: 'barang', unit: 'galon', costPriceIdr: 220_000, sellPriceIdr: 285_000, showOnLanding: false },
  { code: 'BR-FILTER', name: 'Filter Oli', kind: 'barang', unit: 'pcs', costPriceIdr: 35_000, sellPriceIdr: 55_000, showOnLanding: false },
  { code: 'BR-KAMPAS', name: 'Kampas Rem Set', kind: 'barang', unit: 'set', costPriceIdr: 180_000, sellPriceIdr: 260_000, showOnLanding: false },
  { code: 'BR-DEMPUL', name: 'Dempul Body 1 kg', kind: 'barang', unit: 'kg', costPriceIdr: 65_000, sellPriceIdr: 95_000, showOnLanding: false }
];
