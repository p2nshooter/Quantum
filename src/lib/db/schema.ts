import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  LeadStatus,
  PaymentMethod,
  Priority,
  StageStatus,
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

/* --- Produksi ------------------------------------------------------------ */

export const workOrders = sqliteTable(
  'work_orders',
  {
    id: text('id').primaryKey(),
    /** Nomor SPK (Surat Perintah Kerja), format SPK/YYYYMM/NNN. */
    spkNumber: text('spk_number').notNull().unique(),
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
    contractValueIdr: integer('contract_value_idr').notNull().default(0),
    status: text('status').$type<WorkOrderStatus>().notNull().default('draft'),
    priority: text('priority').$type<Priority>().notNull().default('normal'),
    startDate: integer('start_date', { mode: 'timestamp_ms' }),
    targetDate: integer('target_date', { mode: 'timestamp_ms' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
    ...timestamps
  },
  (t) => ({
    customerIdx: index('wo_customer_idx').on(t.customerId),
    statusIdx: index('wo_status_idx').on(t.status),
    chassisIdx: index('wo_chassis_idx').on(t.chassisNumber)
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

/**
 * Termin pembayaran per SPK (DP, termin 1..n, pelunasan). Nominal disimpan
 * sebagai integer rupiah penuh — tanpa sen — supaya penjumlahan piutang bebas
 * galat pembulatan floating point.
 */
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    workOrderId: text('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    amountIdr: integer('amount_idr').notNull(),
    method: text('method').$type<PaymentMethod>().notNull().default('transfer'),
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }).notNull(),
    reference: text('reference'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
  },
  (t) => ({
    workOrderIdx: index('payments_wo_idx').on(t.workOrderId)
  })
);

/* --- Pemasaran ----------------------------------------------------------- */

/** Permintaan penawaran dari form di halaman publik. */
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
