import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  CapitalType,
  EmployeeStatus,
  EmploymentType,
  ExpenseCategory,
  ItemKind,
  JobType,
  LeadStatus,
  PaymentMethod,
  PaymentRefType,
  Priority,
  PromoKind,
  ServiceStatus,
  StageStatus,
  StockMoveType,
  UnitType,
  UserRole,
  WorkOrderStatus
} from '@/lib/karoseri/constants';

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
};

/* --- Akun internal & sesi ------------------------------------------------ */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').$type<UserRole>().notNull().default('produksi'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    ...timestamps
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email)
  })
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId)
  })
);

/* --- Master data --------------------------------------------------------- */

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    company: text('company'),
    phone: text('phone').notNull(),
    email: text('email'),
    address: text('address'),
    city: text('city'),
    npwp: text('npwp'),
    notes: text('notes'),
    ...timestamps
  },
  (t) => ({
    nameIdx: index('customers_name_idx').on(t.name)
  })
);

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  ...timestamps
});

export const bodyModels = sqliteTable('body_models', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  unitType: text('unit_type').$type<UnitType>().notNull(),
  description: text('description'),
  basePriceIdr: integer('base_price_idr').notNull().default(0),
  estimatedDays: integer('estimated_days').notNull().default(30),
  /** Model nonaktif tetap tersimpan (SPK lama tetap valid) tapi tidak ditawarkan lagi. */
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
});

/**
 * Barang (sparepart) dan jasa. `costPriceIdr` adalah harga modal terakhir dan
 * dipakai sebagai dasar HPP; nilainya disalin ke baris order saat transaksi agar
 * laporan lama tidak ikut berubah ketika harga modal naik.
 */
export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    kind: text('kind').$type<ItemKind>().notNull().default('barang'),
    unit: text('unit').notNull().default('pcs'),
    costPriceIdr: integer('cost_price_idr').notNull().default(0),
    sellPriceIdr: integer('sell_price_idr').notNull().default(0),
    stockQty: integer('stock_qty').notNull().default(0),
    minStockQty: integer('min_stock_qty').notNull().default(0),
    /** Tampilkan di daftar harga halaman publik. */
    showOnLanding: integer('show_on_landing', { mode: 'boolean' }).notNull().default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps
  },
  (t) => ({
    kindIdx: index('items_kind_idx').on(t.kind)
  })
);

/** Kartu stok: setiap perubahan jumlah barang meninggalkan jejak di sini. */
export const stockMoves = sqliteTable(
  'stock_moves',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    type: text('type').$type<StockMoveType>().notNull(),
    /** Selalu positif; arah pergerakan ditentukan oleh `type`. */
    qty: integer('qty').notNull(),
    unitCostIdr: integer('unit_cost_idr').notNull().default(0),
    refType: text('ref_type'),
    refId: text('ref_id'),
    notes: text('notes'),
    movedAt: integer('moved_at', { mode: 'timestamp_ms' }).notNull(),
    createdBy: text('created_by').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    itemIdx: index('stock_moves_item_idx').on(t.itemId),
    movedIdx: index('stock_moves_moved_idx').on(t.movedAt)
  })
);

/* --- Produksi: SPK karoseri & body repair -------------------------------- */

export const workOrders = sqliteTable(
  'work_orders',
  {
    id: text('id').primaryKey(),
    /** Nomor SPK, format SPK/YYYYMM/NNN (karoseri) atau BR/YYYYMM/NNN (body repair). */
    spkNumber: text('spk_number').notNull().unique(),
    jobType: text('job_type').$type<JobType>().notNull().default('karoseri'),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    bodyModelId: text('body_model_id').references(() => bodyModels.id),
    unitType: text('unit_type').$type<UnitType>().notNull(),
    chassisBrand: text('chassis_brand').notNull(),
    chassisType: text('chassis_type'),
    /** Nomor rangka — dipakai pelanggan sebagai kunci verifikasi saat melacak progres. */
    chassisNumber: text('chassis_number').notNull(),
    engineNumber: text('engine_number'),
    policeNumber: text('police_number'),
    color: text('color'),
    seatCount: integer('seat_count'),
    specNotes: text('spec_notes'),

    /* Data klaim — hanya relevan untuk body repair yang ditanggung asuransi. */
    insurerName: text('insurer_name'),
    policyNumber: text('policy_number'),
    claimNumber: text('claim_number'),
    surveyorName: text('surveyor_name'),
    /** Own risk yang ditanggung pelanggan. */
    deductibleIdr: integer('deductible_idr').notNull().default(0),

    contractValueIdr: integer('contract_value_idr').notNull().default(0),
    status: text('status').$type<WorkOrderStatus>().notNull().default('draft'),
    priority: text('priority').$type<Priority>().notNull().default('normal'),
    startDate: integer('start_date', { mode: 'timestamp_ms' }),
    targetDate: integer('target_date', { mode: 'timestamp_ms' }),
    /**
     * Saat pekerjaan dinyatakan rampung. Ini titik pengakuan pendapatan di
     * laporan laba rugi — sengaja kolom sendiri, bukan `updatedAt`, supaya
     * mengedit catatan SPK lama tidak menggeser pendapatan ke bulan berjalan.
     */
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
    ...timestamps
  },
  (t) => ({
    customerIdx: index('wo_customer_idx').on(t.customerId),
    completedIdx: index('wo_completed_idx').on(t.completedAt),
    statusIdx: index('wo_status_idx').on(t.status),
    chassisIdx: index('wo_chassis_idx').on(t.chassisNumber),
    jobTypeIdx: index('wo_job_type_idx').on(t.jobType)
  })
);

export const stages = sqliteTable(
  'stages',
  {
    id: text('id').primaryKey(),
    workOrderId: text('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    name: text('name').notNull(),
    /** Bobot tahapan terhadap total pekerjaan unit; satu SPK berjumlah 100. */
    weightPercent: integer('weight_percent').notNull().default(0),
    status: text('status').$type<StageStatus>().notNull().default('pending'),
    picName: text('pic_name'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    notes: text('notes'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    workOrderIdx: index('stages_wo_idx').on(t.workOrderId),
    orderUnique: uniqueIndex('stages_wo_order_unique').on(t.workOrderId, t.sortOrder)
  })
);

/* --- Order servis harian ------------------------------------------------- */

export const serviceOrders = sqliteTable(
  'service_orders',
  {
    id: text('id').primaryKey(),
    /** Nomor order, format SRV/YYYYMM/NNN. */
    orderNumber: text('order_number').notNull().unique(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    policeNumber: text('police_number').notNull(),
    vehicleBrand: text('vehicle_brand'),
    vehicleModel: text('vehicle_model'),
    vehicleYear: integer('vehicle_year'),
    odometerKm: integer('odometer_km'),
    complaint: text('complaint'),
    diagnosis: text('diagnosis'),
    mechanicName: text('mechanic_name'),
    status: text('status').$type<ServiceStatus>().notNull().default('antrian'),

    /* Nilai transaksi; semua integer rupiah penuh. */
    subtotalIdr: integer('subtotal_idr').notNull().default(0),
    discountIdr: integer('discount_idr').notNull().default(0),
    /** Tarif PPN yang berlaku saat order dibuat, disalin dari pengaturan. */
    taxPercent: integer('tax_percent').notNull().default(0),
    taxIdr: integer('tax_idr').notNull().default(0),
    totalIdr: integer('total_idr').notNull().default(0),
    /** HPP barang terpakai, disalin dari harga modal saat transaksi. */
    cogsIdr: integer('cogs_idr').notNull().default(0),

    checkInAt: integer('check_in_at', { mode: 'timestamp_ms' }),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    pickedUpAt: integer('picked_up_at', { mode: 'timestamp_ms' }),
    notes: text('notes'),
    ...timestamps
  },
  (t) => ({
    customerIdx: index('so_customer_idx').on(t.customerId),
    statusIdx: index('so_status_idx').on(t.status),
    plateIdx: index('so_plate_idx').on(t.policeNumber)
  })
);

export const serviceOrderItems = sqliteTable(
  'service_order_items',
  {
    id: text('id').primaryKey(),
    serviceOrderId: text('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    /** Boleh kosong untuk pekerjaan/barang dadakan yang tidak ada di master. */
    itemId: text('item_id').references(() => items.id),
    name: text('name').notNull(),
    kind: text('kind').$type<ItemKind>().notNull().default('jasa'),
    qty: integer('qty').notNull().default(1),
    unitPriceIdr: integer('unit_price_idr').notNull().default(0),
    /** Salinan harga modal saat transaksi — dasar perhitungan laba per order. */
    unitCostIdr: integer('unit_cost_idr').notNull().default(0),
    subtotalIdr: integer('subtotal_idr').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    orderIdx: index('soi_order_idx').on(t.serviceOrderId)
  })
);

/* --- Kas masuk: pembayaran pelanggan ------------------------------------- */

/**
 * Satu tabel pembayaran melayani SPK maupun order servis lewat pasangan
 * `refType` + `refId`. Relasi polimorfik tidak bisa memakai foreign key, jadi
 * baris pembayaran dihapus manual di handler penghapusan SPK/order servis —
 * lihat `deleteWorkOrderCascade()` dan `deleteServiceOrderCascade()`.
 */
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    refType: text('ref_type').$type<PaymentRefType>().notNull(),
    refId: text('ref_id').notNull(),
    label: text('label').notNull(),
    amountIdr: integer('amount_idr').notNull(),
    method: text('method').$type<PaymentMethod>().notNull().default('transfer'),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }).notNull(),
    reference: text('reference'),
    notes: text('notes'),
    createdBy: text('created_by').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    refIdx: index('payments_ref_idx').on(t.refType, t.refId),
    paidIdx: index('payments_paid_idx').on(t.paidAt)
  })
);

/* --- Kas keluar: pembelian, biaya, modal --------------------------------- */

/** Pembelian barang ke supplier. Menambah stok dan — bila belum lunas — menjadi utang. */
export const purchases = sqliteTable(
  'purchases',
  {
    id: text('id').primaryKey(),
    purchaseNumber: text('purchase_number').notNull().unique(),
    supplierId: text('supplier_id').references(() => suppliers.id),
    supplierName: text('supplier_name'),
    invoiceNumber: text('invoice_number'),
    totalIdr: integer('total_idr').notNull().default(0),
    paidIdr: integer('paid_idr').notNull().default(0),
    purchasedAt: integer('purchased_at', { mode: 'timestamp_ms' }).notNull(),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    notes: text('notes'),
    createdBy: text('created_by').references(() => users.id),
    ...timestamps
  },
  (t) => ({
    purchasedIdx: index('purchases_purchased_idx').on(t.purchasedAt),
    supplierIdx: index('purchases_supplier_idx').on(t.supplierId)
  })
);

export const purchaseItems = sqliteTable(
  'purchase_items',
  {
    id: text('id').primaryKey(),
    purchaseId: text('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    itemId: text('item_id').references(() => items.id),
    name: text('name').notNull(),
    qty: integer('qty').notNull().default(1),
    unitCostIdr: integer('unit_cost_idr').notNull().default(0),
    subtotalIdr: integer('subtotal_idr').notNull().default(0)
  },
  (t) => ({
    purchaseIdx: index('purchase_items_purchase_idx').on(t.purchaseId)
  })
);

/**
 * Biaya di luar pembelian barang. Kategori `bahan_produksi` dihitung sebagai
 * HPP di laporan laba rugi, sisanya sebagai biaya operasional.
 */
export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    category: text('category').$type<ExpenseCategory>().notNull().default('lainnya'),
    description: text('description').notNull(),
    amountIdr: integer('amount_idr').notNull(),
    vendorName: text('vendor_name'),
    /** Biaya bahan bisa dikaitkan ke SPK tertentu agar HPP per unit terlihat. */
    workOrderId: text('work_order_id').references(() => workOrders.id),
    spentAt: integer('spent_at', { mode: 'timestamp_ms' }).notNull(),
    /** Kosong berarti belum dibayar alias masih utang. */
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
    dueDate: integer('due_date', { mode: 'timestamp_ms' }),
    method: text('method').$type<PaymentMethod>(),
    notes: text('notes'),
    createdBy: text('created_by').references(() => users.id),
    ...timestamps
  },
  (t) => ({
    spentIdx: index('expenses_spent_idx').on(t.spentAt),
    categoryIdx: index('expenses_category_idx').on(t.category),
    workOrderIdx: index('expenses_wo_idx').on(t.workOrderId)
  })
);

/** Setoran dan penarikan modal pemilik. Bukan pendapatan/biaya — hanya arus kas. */
export const capitalEntries = sqliteTable(
  'capital_entries',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<CapitalType>().notNull(),
    ownerName: text('owner_name').notNull(),
    amountIdr: integer('amount_idr').notNull(),
    method: text('method').$type<PaymentMethod>().notNull().default('transfer'),
    entryAt: integer('entry_at', { mode: 'timestamp_ms' }).notNull(),
    notes: text('notes'),
    createdBy: text('created_by').references(() => users.id),
    ...timestamps
  },
  (t) => ({
    entryIdx: index('capital_entry_idx').on(t.entryAt)
  })
);

/* --- Penggajian ---------------------------------------------------------- */

/** Bagian/departemen bengkel — master sendiri agar bisa ditambah tanpa deploy. */
export const divisions = sqliteTable('divisions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps
});

export const employees = sqliteTable(
  'employees',
  {
    id: text('id').primaryKey(),
    employeeNumber: text('employee_number'),
    name: text('name').notNull(),
    position: text('position'),
    /** Nama bagian disalin, bukan hanya id, supaya slip gaji lama tetap terbaca
     *  apa adanya walau bagiannya nanti diganti nama atau dihapus. */
    division: text('division'),
    divisionId: text('division_id').references(() => divisions.id),
    phone: text('phone'),
    address: text('address'),
    idNumber: text('id_number'),
    bankAccount: text('bank_account'),

    /* Kepegawaian & kontrak kerja */
    employmentType: text('employment_type').$type<EmploymentType>().notNull().default('tetap'),
    status: text('status').$type<EmployeeStatus>().notNull().default('aktif'),
    joinDate: integer('join_date', { mode: 'timestamp_ms' }),
    contractNumber: text('contract_number'),
    contractStart: integer('contract_start', { mode: 'timestamp_ms' }),
    contractEnd: integer('contract_end', { mode: 'timestamp_ms' }),

    baseSalaryIdr: integer('base_salary_idr').notNull().default(0),
    /** Upah harian/borongan untuk yang tidak bergaji bulanan. */
    dailyRateIdr: integer('daily_rate_idr').notNull().default(0),
    notes: text('notes'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps
  },
  (t) => ({
    divisionIdx: index('employees_division_idx').on(t.divisionId),
    statusIdx: index('employees_status_idx').on(t.status)
  })
);

/**
 * Satu baris = satu slip gaji.
 *
 * Komponen gaji disimpan sebagai JSON, bukan kolom tetap, karena tiap karyawan
 * memakai gabungan komponen yang berbeda — dan yang tersimpan hanyalah komponen
 * yang dicentang, sehingga slip lama tetap mencerminkan apa yang benar-benar
 * dibayarkan waktu itu meski daftar komponennya nanti berubah.
 */
export const payrolls = sqliteTable(
  'payrolls',
  {
    id: text('id').primaryKey(),
    slipNumber: text('slip_number').notNull().unique(),
    employeeId: text('employee_id')
      .notNull()
      .references(() => employees.id),
    periodFrom: integer('period_from', { mode: 'timestamp_ms' }).notNull(),
    periodTo: integer('period_to', { mode: 'timestamp_ms' }).notNull(),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }).notNull(),
    method: text('method').$type<PaymentMethod>().notNull().default('transfer'),
    componentsJson: text('components_json').notNull(),
    grossIdr: integer('gross_idr').notNull().default(0),
    deductionIdr: integer('deduction_idr').notNull().default(0),
    netIdr: integer('net_idr').notNull().default(0),
    notes: text('notes'),
    /** Biaya gaji yang otomatis tercatat agar penggajian masuk laporan laba rugi. */
    expenseId: text('expense_id'),
    createdBy: text('created_by').references(() => users.id),
    ...timestamps
  },
  (t) => ({
    employeeIdx: index('payrolls_employee_idx').on(t.employeeId),
    paidIdx: index('payrolls_paid_idx').on(t.paidAt)
  })
);

/* --- Pemasaran & konten halaman publik ----------------------------------- */

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    company: text('company'),
    phone: text('phone').notNull(),
    email: text('email'),
    unitType: text('unit_type').$type<UnitType>().notNull(),
    quantity: integer('quantity').notNull().default(1),
    message: text('message'),
    status: text('status').$type<LeadStatus>().notNull().default('baru'),
    handledBy: text('handled_by').references(() => users.id),
    internalNotes: text('internal_notes'),
    ...timestamps
  },
  (t) => ({
    statusIdx: index('leads_status_idx').on(t.status)
  })
);

/** Promo, event, dan pengumuman yang tampil di halaman depan. Diisi lewat panel. */
export const promos = sqliteTable(
  'promos',
  {
    id: text('id').primaryKey(),
    kind: text('kind').$type<PromoKind>().notNull().default('promo'),
    title: text('title').notNull(),
    description: text('description'),
    emoji: text('emoji').notNull().default('🎉'),
    /** Harga sebelum dan sesudah promo; kosongkan bila promo tanpa angka. */
    normalPriceIdr: integer('normal_price_idr'),
    promoPriceIdr: integer('promo_price_idr'),
    ctaLabel: text('cta_label'),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    sortOrder: integer('sort_order').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps
  },
  (t) => ({
    activeIdx: index('promos_active_idx').on(t.active)
  })
);

/* --- Pengaturan sistem --------------------------------------------------- */

/**
 * Penyimpanan key–value untuk setelan yang bisa diubah admin tanpa deploy:
 * tarif PPN, tarif PPh, identitas pada kop laporan, dan sejenisnya.
 * Lihat `src/lib/settings.ts` untuk daftar kunci dan nilai bawaannya.
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedBy: text('updated_by').references(() => users.id)
});

/* --- Jejak audit --------------------------------------------------------- */

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').references(() => users.id),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metaJson: text('meta_json'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    actorIdx: index('audit_actor_idx').on(t.actorUserId),
    createdIdx: index('audit_created_idx').on(t.createdAt)
  })
);
