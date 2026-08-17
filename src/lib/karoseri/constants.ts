/**
 * Domain karoseri: tipe unit, status SPK, dan template tahapan produksi.
 *
 * File ini sengaja bebas dependency (tidak mengimpor drizzle/next) supaya aman
 * dipakai dari server component, route handler, maupun client component.
 */

export const UNIT_TYPES = [
  'bus_besar',
  'bus_medium',
  'microbus',
  'truck_box',
  'wingbox',
  'dump',
  'tangki',
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

export const PAYMENT_METHODS = ['transfer', 'tunai', 'cek', 'giro', 'lainnya'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'Transfer Bank',
  tunai: 'Tunai',
  cek: 'Cek',
  giro: 'Giro',
  lainnya: 'Lainnya'
};

export const LEAD_STATUSES = ['baru', 'diproses', 'penawaran', 'deal', 'batal'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  penawaran: 'Penawaran Terkirim',
  deal: 'Deal',
  batal: 'Batal'
};

export const USER_ROLES = ['admin', 'produksi', 'keuangan'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrator',
  produksi: 'Kepala Produksi',
  keuangan: 'Keuangan'
};

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

export const STAGE_TEMPLATES: Record<UnitType, StageTemplate[]> = {
  bus_besar: BUS_STAGES,
  bus_medium: BUS_STAGES,
  microbus: BUS_STAGES,
  truck_box: TRUCK_BOX_STAGES,
  wingbox: WINGBOX_STAGES,
  dump: DUMP_STAGES,
  tangki: TANGKI_STAGES,
  custom: CUSTOM_STAGES
};

export function stageTemplateFor(unitType: UnitType): StageTemplate[] {
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
