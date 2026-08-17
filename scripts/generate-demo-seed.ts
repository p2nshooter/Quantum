/**
 * Membuat `seed/demo.sql` berisi contoh transaksi supaya sistem tidak kosong saat
 * pertama dibuka — dan supaya laporan pemilik langsung menampilkan angka nyata.
 *
 * Lima transaksi yang dibuat saling terhubung sebagai satu siklus usaha utuh:
 *   1. SPK karoseri box besi (selesai)      → pendapatan karoseri + piutang sisa
 *   2. SPK body repair klaim asuransi (selesai) → pendapatan body repair
 *   3. Order servis ganti oli + tune up (lunas) → pendapatan jasa & barang + HPP
 *   4. Pembelian sparepart ke supplier (belum lunas) → stok masuk + utang
 *   5. Biaya operasional & setoran modal     → biaya + arus kas
 *
 * Semua baris memakai id tetap berawalan `demo_`, jadi:
 *   - menjalankan seed berulang kali tidak menggandakan data (INSERT OR IGNORE), dan
 *   - seluruhnya bisa dihapus lagi lewat panel admin seperti data biasa.
 *
 * Jalankan: npm run generate:demo
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Tanggal relatif terhadap hari ini agar contoh selalu jatuh di bulan berjalan. */
function daysAgo(days: number): number {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.getTime();
}

function period(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function q(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

const P = period();
const lines: string[] = [
  '-- Contoh transaksi demo. Dihasilkan oleh `npm run generate:demo`.',
  '-- Aman dijalankan berulang (INSERT OR IGNORE dengan id tetap).',
  '-- Semua baris bisa diubah/dihapus lewat panel seperti data biasa.',
  ''
];

function insert(table: string, row: Record<string, string | number | null>) {
  const cols = Object.keys(row).join(', ');
  const vals = Object.values(row)
    .map((v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : q(v)))
    .join(', ');
  lines.push(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${vals});`);
}

/* --- Master data ---------------------------------------------------------- */

lines.push('-- Pelanggan');
insert('customers', {
  id: 'demo_cust_po_lancar',
  name: 'Budi Santoso',
  company: 'PO Maju Lancar',
  phone: '081234567890',
  city: 'Bekasi',
  address: 'Jl. Industri Raya No. 12, Cikarang',
  created_at: daysAgo(60),
  updated_at: daysAgo(60)
});
insert('customers', {
  id: 'demo_cust_siti',
  name: 'Siti Rahma',
  company: null,
  phone: '081298765432',
  city: 'Bekasi',
  created_at: daysAgo(30),
  updated_at: daysAgo(30)
});
insert('customers', {
  id: 'demo_cust_angkasa',
  name: 'Hendra Wijaya',
  company: 'CV Angkasa Trans',
  phone: '081377766655',
  city: 'Karawang',
  created_at: daysAgo(20),
  updated_at: daysAgo(20)
});
lines.push('');

lines.push('-- Supplier');
insert('suppliers', {
  id: 'demo_sup_sparepart',
  name: 'Toko Sparepart Jaya Motor',
  phone: '02188990011',
  address: 'Jl. Raya Sukatani, Bekasi',
  created_at: daysAgo(45),
  updated_at: daysAgo(45)
});
lines.push('');

/* --- 1. SPK karoseri (selesai) -------------------------------------------- */

lines.push('-- 1. SPK karoseri: box besi 6 ban, sudah selesai, DP + termin sudah masuk');
insert('work_orders', {
  id: 'demo_spk_box',
  spk_number: `SPK/${P}/001`,
  job_type: 'karoseri',
  customer_id: 'demo_cust_po_lancar',
  body_model_id: 'mdl_seed_box_std_6',
  unit_type: 'truck_box',
  chassis_brand: 'Hino',
  chassis_type: 'Dutro 130 HD',
  chassis_number: 'MJEFC1AB2NK012345',
  engine_number: 'W04D-TR-99881',
  police_number: 'B 9123 KYT',
  color: 'Putih',
  spec_notes: 'Box besi standar, pintu belakang dua daun, lampu LED, striping logo perusahaan.',
  contract_value_idr: 65_000_000,
  status: 'selesai',
  priority: 'normal',
  start_date: daysAgo(40),
  target_date: daysAgo(10),
  completed_at: daysAgo(8),
  created_at: daysAgo(42),
  updated_at: daysAgo(8)
});
insert('payments', {
  id: 'demo_pay_box_dp',
  ref_type: 'work_order',
  ref_id: 'demo_spk_box',
  label: 'DP 50%',
  amount_idr: 32_500_000,
  method: 'transfer',
  paid_at: daysAgo(40),
  reference: 'TRF-BCA-8891',
  created_at: daysAgo(40)
});
insert('payments', {
  id: 'demo_pay_box_termin',
  ref_type: 'work_order',
  ref_id: 'demo_spk_box',
  label: 'Termin 2',
  amount_idr: 20_000_000,
  method: 'transfer',
  paid_at: daysAgo(9),
  reference: 'TRF-BCA-9032',
  created_at: daysAgo(9)
});
lines.push('-- sisa piutang SPK ini: 65.000.000 - 52.500.000 = 12.500.000');
lines.push('');

/* --- 2. SPK body repair (klaim asuransi) ---------------------------------- */

lines.push('-- 2. SPK body repair klaim asuransi, sudah selesai dan lunas');
insert('work_orders', {
  id: 'demo_spk_br',
  spk_number: `BR/${P}/001`,
  job_type: 'body_repair',
  customer_id: 'demo_cust_siti',
  body_model_id: null,
  unit_type: 'mobil_penumpang',
  chassis_brand: 'Toyota',
  chassis_type: 'Avanza 1.3 G',
  chassis_number: 'MHKM1BA3JKJ556677',
  police_number: 'B 1212 FEZ',
  color: 'Hitam',
  spec_notes: 'Perbaikan bumper depan, fender kanan, dan pengecatan ulang 3 panel.',
  insurer_name: 'PT Asuransi Sinar Mas',
  policy_number: 'POL-2026-334455',
  claim_number: 'CLM-88123',
  surveyor_name: 'Andi Kurniawan',
  deductible_idr: 300_000,
  contract_value_idr: 6_800_000,
  status: 'diserahkan',
  priority: 'tinggi',
  start_date: daysAgo(18),
  target_date: daysAgo(6),
  completed_at: daysAgo(5),
  delivered_at: daysAgo(4),
  created_at: daysAgo(19),
  updated_at: daysAgo(4)
});
insert('payments', {
  id: 'demo_pay_br_or',
  ref_type: 'work_order',
  ref_id: 'demo_spk_br',
  label: 'Own Risk pelanggan',
  amount_idr: 300_000,
  method: 'tunai',
  paid_at: daysAgo(4),
  created_at: daysAgo(4)
});
insert('payments', {
  id: 'demo_pay_br_asuransi',
  ref_type: 'work_order',
  ref_id: 'demo_spk_br',
  label: 'Klaim asuransi',
  amount_idr: 6_500_000,
  method: 'transfer',
  paid_at: daysAgo(2),
  reference: 'CLM-88123',
  created_at: daysAgo(2)
});
lines.push('');

/* --- 3. Order servis harian ------------------------------------------------ */

lines.push('-- 3. Order servis: ganti oli + tune up, barang keluar dari stok, lunas');
const servisSubtotal = 75_000 + 350_000 + 285_000 + 55_000;
insert('service_orders', {
  id: 'demo_srv_avanza',
  order_number: `SRV/${P}/001`,
  customer_id: 'demo_cust_angkasa',
  police_number: 'B 2212 FFZ',
  vehicle_brand: 'Suzuki',
  vehicle_model: 'APV Arena',
  vehicle_year: 2019,
  odometer_km: 148_500,
  complaint: 'Mesin terasa berat saat menanjak, oli sudah lama tidak diganti.',
  diagnosis: 'Oli mesin kotor, busi aus. Dilakukan ganti oli + filter dan tune up.',
  mechanic_name: 'Rudi',
  status: 'diambil',
  subtotal_idr: servisSubtotal,
  discount_idr: 15_000,
  tax_percent: 0,
  tax_idr: 0,
  total_idr: servisSubtotal - 15_000,
  cogs_idr: 220_000 + 35_000,
  check_in_at: daysAgo(3),
  finished_at: daysAgo(3),
  picked_up_at: daysAgo(3),
  created_at: daysAgo(3),
  updated_at: daysAgo(3)
});

const serviceLines = [
  ['demo_sit_1', 'JS-OLI', 'Jasa Ganti Oli', 'jasa', 1, 75_000, 0],
  ['demo_sit_2', 'JS-TUNEUP', 'Tune Up Mesin', 'jasa', 1, 350_000, 0],
  ['demo_sit_3', 'BR-OLI-4L', 'Oli Mesin 4 Liter', 'barang', 1, 285_000, 220_000],
  ['demo_sit_4', 'BR-FILTER', 'Filter Oli', 'barang', 1, 55_000, 35_000]
] as const;

for (const [id, code, name, kind, qty, price, cost] of serviceLines) {
  const itemId = `mdl_item_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  insert('service_order_items', {
    id,
    service_order_id: 'demo_srv_avanza',
    item_id: itemId,
    name,
    kind,
    qty,
    unit_price_idr: price,
    unit_cost_idr: cost,
    subtotal_idr: qty * price,
    created_at: daysAgo(3)
  });
  if (kind === 'barang') {
    insert('stock_moves', {
      id: `${id}_stk`,
      item_id: itemId,
      type: 'keluar',
      qty,
      unit_cost_idr: cost,
      ref_type: 'service_order',
      ref_id: 'demo_srv_avanza',
      notes: 'Pemakaian pada order servis',
      moved_at: daysAgo(3),
      created_at: daysAgo(3)
    });
    lines.push(`UPDATE items SET stock_qty = stock_qty - ${qty} WHERE id = ${q(itemId)};`);
  }
}

insert('payments', {
  id: 'demo_pay_srv',
  ref_type: 'service_order',
  ref_id: 'demo_srv_avanza',
  label: 'Pelunasan servis',
  amount_idr: servisSubtotal - 15_000,
  method: 'tunai',
  paid_at: daysAgo(3),
  created_at: daysAgo(3)
});
lines.push('');

/* --- 4. Pembelian sparepart (belum lunas → utang) ------------------------- */

lines.push('-- 4. Pembelian sparepart ke supplier, baru dibayar sebagian → jadi utang');
insert('purchases', {
  id: 'demo_pur_sparepart',
  purchase_number: `PB/${P}/001`,
  supplier_id: 'demo_sup_sparepart',
  supplier_name: 'Toko Sparepart Jaya Motor',
  invoice_number: 'INV-JM-77219',
  total_idr: 4_300_000,
  paid_idr: 2_000_000,
  purchased_at: daysAgo(12),
  due_date: daysAgo(-18),
  notes: 'Stok oli, filter, dan kampas rem untuk kebutuhan bulan ini.',
  created_at: daysAgo(12),
  updated_at: daysAgo(12)
});

const purchaseLines = [
  ['demo_pi_1', 'BR-OLI-4L', 'Oli Mesin 4 Liter', 10, 220_000],
  ['demo_pi_2', 'BR-FILTER', 'Filter Oli', 20, 35_000],
  ['demo_pi_3', 'BR-KAMPAS', 'Kampas Rem Set', 8, 180_000]
] as const;

for (const [id, code, name, qty, cost] of purchaseLines) {
  const itemId = `mdl_item_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  insert('purchase_items', {
    id,
    purchase_id: 'demo_pur_sparepart',
    item_id: itemId,
    name,
    qty,
    unit_cost_idr: cost,
    subtotal_idr: qty * cost
  });
  insert('stock_moves', {
    id: `${id}_stk`,
    item_id: itemId,
    type: 'masuk',
    qty,
    unit_cost_idr: cost,
    ref_type: 'purchase',
    ref_id: 'demo_pur_sparepart',
    notes: 'Pembelian dari supplier',
    moved_at: daysAgo(12),
    created_at: daysAgo(12)
  });
  lines.push(`UPDATE items SET stock_qty = stock_qty + ${qty} WHERE id = ${q(itemId)};`);
}
lines.push('-- sisa utang pembelian ini: 4.300.000 - 2.000.000 = 2.300.000');
lines.push('');

/* --- 5. Biaya operasional & modal ----------------------------------------- */

lines.push('-- 5. Biaya operasional bulan berjalan dan setoran modal pemilik');
const expenseRows = [
  ['demo_exp_gaji', 'gaji_upah', 'Gaji 4 mekanik bulan berjalan', 14_000_000, 5, daysAgo(5)],
  ['demo_exp_listrik', 'listrik_air', 'Listrik & air bengkel', 1_850_000, 6, daysAgo(6)],
  ['demo_exp_sewa', 'sewa_tempat', 'Sewa lahan bengkel', 5_000_000, 7, daysAgo(7)],
  ['demo_exp_bahan', 'bahan_produksi', 'Plat besi & cat untuk SPK box', 18_500_000, 14, daysAgo(14)]
] as const;

for (const [id, category, description, amount, , spentAt] of expenseRows) {
  insert('expenses', {
    id,
    category,
    description,
    amount_idr: amount,
    vendor_name: null,
    work_order_id: id === 'demo_exp_bahan' ? 'demo_spk_box' : null,
    spent_at: spentAt,
    paid_at: spentAt,
    method: 'transfer',
    created_at: spentAt,
    updated_at: spentAt
  });
}

// Satu biaya sengaja belum dibayar supaya laporan utang ada isinya.
insert('expenses', {
  id: 'demo_exp_belum_bayar',
  category: 'peralatan',
  description: 'Servis kompresor & ganti selang angin',
  amount_idr: 2_400_000,
  vendor_name: 'Bengkel Teknik Sentosa',
  work_order_id: null,
  spent_at: daysAgo(4),
  paid_at: null,
  due_date: daysAgo(-10),
  created_at: daysAgo(4),
  updated_at: daysAgo(4)
});

insert('capital_entries', {
  id: 'demo_cap_setoran',
  type: 'setoran',
  owner_name: 'Pemilik',
  amount_idr: 50_000_000,
  method: 'transfer',
  entry_at: daysAgo(50),
  notes: 'Modal awal operasional bengkel',
  created_at: daysAgo(50),
  updated_at: daysAgo(50)
});
insert('capital_entries', {
  id: 'demo_cap_prive',
  type: 'penarikan',
  owner_name: 'Pemilik',
  amount_idr: 5_000_000,
  method: 'tunai',
  entry_at: daysAgo(11),
  notes: 'Prive bulan berjalan',
  created_at: daysAgo(11),
  updated_at: daysAgo(11)
});
lines.push('');

/* --- Promo di halaman depan ----------------------------------------------- */

lines.push('-- Contoh promo & event untuk halaman depan');
insert('promos', {
  id: 'demo_promo_oli',
  kind: 'promo',
  title: 'Paket Ganti Oli + Filter',
  description: 'Oli mesin 4 liter, filter oli, dan jasa pasang. Berlaku untuk mobil penumpang.',
  emoji: '🛢️',
  normal_price_idr: 415_000,
  promo_price_idr: 349_000,
  cta_label: 'Pesan lewat WhatsApp',
  starts_at: daysAgo(7),
  ends_at: daysAgo(-30),
  sort_order: 1,
  active: 1,
  created_at: daysAgo(7),
  updated_at: daysAgo(7)
});
insert('promos', {
  id: 'demo_promo_cat',
  kind: 'promo',
  title: 'Cat Ulang 3 Panel',
  description: 'Termasuk dempul, epoxy, cat, dan poles. Garansi hasil pengecatan 3 bulan.',
  emoji: '🎨',
  normal_price_idr: 1_350_000,
  promo_price_idr: 1_150_000,
  cta_label: 'Konsultasi gratis',
  starts_at: daysAgo(7),
  ends_at: daysAgo(-30),
  sort_order: 2,
  active: 1,
  created_at: daysAgo(7),
  updated_at: daysAgo(7)
});
insert('promos', {
  id: 'demo_event_servis',
  kind: 'event',
  title: 'Servis Gratis Cek 20 Titik',
  description: 'Setiap Sabtu, pemeriksaan menyeluruh 20 titik tanpa biaya. Cukup daftar via WhatsApp.',
  emoji: '🔧',
  normal_price_idr: null,
  promo_price_idr: null,
  cta_label: 'Daftar sekarang',
  starts_at: daysAgo(7),
  ends_at: daysAgo(-60),
  sort_order: 3,
  active: 1,
  created_at: daysAgo(7),
  updated_at: daysAgo(7)
});

const outPath = resolve(process.cwd(), 'seed/demo.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

console.log('✔ seed/demo.sql dibuat — 5 kelompok transaksi contoh:');
console.log('  1. SPK karoseri box besi 6 ban  Rp 65.000.000 (sisa piutang Rp 12.500.000)');
console.log('  2. SPK body repair klaim asuransi Rp 6.800.000 (lunas)');
console.log('  3. Order servis ganti oli + tune up Rp 750.000 (lunas, stok berkurang)');
console.log('  4. Pembelian sparepart Rp 4.300.000 (utang Rp 2.300.000)');
console.log('  5. Biaya operasional Rp 41.750.000 + modal masuk Rp 50.000.000');
console.log('\nSemua data ini bisa diubah/dihapus lewat panel admin seperti data biasa.');
