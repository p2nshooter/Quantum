import { z } from 'zod';
import {
  CAPITAL_TYPES,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  EXPENSE_CATEGORIES,
  ITEM_KINDS,
  JOB_TYPES,
  LEAD_STATUSES,
  PAYMENT_METHODS,
  PAYROLL_COMPONENT_TYPES,
  PPH_BASES,
  PRIORITIES,
  PROMO_KINDS,
  SERVICE_STATUSES,
  STAGE_STATUSES,
  STOCK_MOVE_TYPES,
  UNIT_TYPES,
  USER_ROLES,
  WORK_ORDER_STATUSES
} from '@/lib/karoseri/constants';

/**
 * Field teks opsional untuk skema yang mengirim objek utuh (create/replace):
 * tidak dikirim sama artinya dengan dikosongkan, jadi keduanya jadi `null`.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** `2026-08-17` dari `<input type="date">`, atau kosong. Untuk skema objek utuh. */
const dateInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/**
 * Versi untuk PATCH parsial. `.optional()` diletakkan paling luar supaya field
 * yang tidak dikirim tetap bernilai `undefined` — artinya "jangan diubah" —
 * sedangkan `null`/string kosong berarti "kosongkan". Kalau `.optional()` ada di
 * dalam transform, field yang tidak dikirim ikut berubah jadi `null` dan PATCH
 * status saja akan menghapus PIC, catatan, atau tanggal yang sudah terisi.
 */
const patchText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null))
    .optional();

const patchDate = z
  .union([z.literal(''), z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')])
  .nullable()
  .transform((v) => (v ? v : null))
  .optional();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(200)
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').max(200),
  role: z.enum(USER_ROLES)
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(USER_ROLES).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').max(200).optional()
});

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nama pelanggan minimal 2 karakter').max(100),
  company: optionalText(120),
  phone: z.string().trim().min(6, 'Nomor telepon tidak valid').max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email tidak valid')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  address: optionalText(300),
  city: optionalText(80),
  npwp: optionalText(40),
  notes: optionalText(500)
});

export const bodyModelSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Kode minimal 2 karakter')
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Kode hanya boleh huruf kapital, angka, dan tanda hubung.'),
  name: z.string().trim().min(3, 'Nama model minimal 3 karakter').max(120),
  unitType: z.enum(UNIT_TYPES),
  description: optionalText(500),
  basePriceIdr: z.number().int().min(0, 'Harga tidak boleh negatif').max(100_000_000_000),
  estimatedDays: z.number().int().min(1, 'Estimasi minimal 1 hari').max(730),
  active: z.boolean().default(true)
});

export const workOrderCreateSchema = z.object({
  jobType: z.enum(JOB_TYPES).default('karoseri'),
  customerId: z.string().trim().min(1, 'Pelanggan wajib dipilih'),
  bodyModelId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  unitType: z.enum(UNIT_TYPES),
  chassisBrand: z.string().trim().min(2, 'Merek chassis wajib diisi').max(60),
  chassisType: optionalText(60),
  chassisNumber: z.string().trim().min(4, 'Nomor rangka minimal 4 karakter').max(60),
  engineNumber: optionalText(60),
  policeNumber: optionalText(20),
  color: optionalText(40),
  seatCount: z
    .number()
    .int()
    .min(0)
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  specNotes: optionalText(2000),
  insurerName: optionalText(80),
  policyNumber: optionalText(60),
  claimNumber: optionalText(60),
  surveyorName: optionalText(80),
  deductibleIdr: z.number().int().min(0).max(100_000_000_000).default(0),
  contractValueIdr: z.number().int().min(0, 'Nilai kontrak tidak boleh negatif').max(100_000_000_000),
  status: z.enum(WORK_ORDER_STATUSES).default('draft'),
  priority: z.enum(PRIORITIES).default('normal'),
  startDate: dateInput,
  targetDate: dateInput
});

export const workOrderUpdateSchema = workOrderCreateSchema.partial().extend({
  deliveredAt: patchDate
});

export const stageUpdateSchema = z.object({
  status: z.enum(STAGE_STATUSES).optional(),
  picName: patchText(80),
  notes: patchText(1000),
  startedAt: patchDate,
  finishedAt: patchDate
});

export const paymentSchema = z.object({
  label: z.string().trim().min(2, 'Keterangan termin wajib diisi').max(60),
  amountIdr: z.number().int().min(1, 'Nominal harus lebih dari nol').max(100_000_000_000),
  method: z.enum(PAYMENT_METHODS),
  paidAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal bayar wajib diisi'),
  reference: optionalText(80),
  notes: optionalText(300)
});

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  company: optionalText(120),
  phone: z.string().trim().min(6, 'Nomor telepon/WhatsApp tidak valid').max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email tidak valid')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  unitType: z.enum(UNIT_TYPES),
  quantity: z.number().int().min(1, 'Jumlah unit minimal 1').max(500).default(1),
  message: optionalText(1500)
});

export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  internalNotes: patchText(1000)
});

export const trackSchema = z.object({
  spkNumber: z.string().trim().min(3, 'Nomor SPK wajib diisi').max(40),
  chassisNumber: z.string().trim().min(4, 'Nomor rangka wajib diisi').max(60)
});

/* --- Barang, jasa & stok ------------------------------------------------- */

export const itemSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Kode minimal 2 karakter')
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Kode hanya boleh huruf kapital, angka, dan tanda hubung.'),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  kind: z.enum(ITEM_KINDS),
  unit: z.string().trim().min(1).max(20).default('pcs'),
  costPriceIdr: z.number().int().min(0, 'Harga modal tidak boleh negatif').max(100_000_000_000),
  sellPriceIdr: z.number().int().min(0, 'Harga jual tidak boleh negatif').max(100_000_000_000),
  minStockQty: z.number().int().min(0).max(1_000_000).default(0),
  showOnLanding: z.boolean().default(false),
  active: z.boolean().default(true)
});

export const stockAdjustSchema = z.object({
  type: z.enum(STOCK_MOVE_TYPES),
  qty: z.number().int().min(1, 'Jumlah minimal 1').max(1_000_000),
  unitCostIdr: z.number().int().min(0).max(100_000_000_000).default(0),
  movedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib diisi'),
  notes: optionalText(200)
});

/* --- Order servis -------------------------------------------------------- */

export const serviceLineSchema = z.object({
  itemId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  name: z.string().trim().min(2, 'Nama pekerjaan/barang wajib diisi').max(120),
  kind: z.enum(ITEM_KINDS),
  qty: z.number().int().min(1, 'Jumlah minimal 1').max(10_000),
  unitPriceIdr: z.number().int().min(0).max(100_000_000_000),
  unitCostIdr: z.number().int().min(0).max(100_000_000_000).optional()
});

export const serviceOrderCreateSchema = z.object({
  customerId: z.string().trim().min(1, 'Pelanggan wajib dipilih'),
  policeNumber: z.string().trim().min(3, 'Nomor polisi wajib diisi').max(20),
  vehicleBrand: optionalText(60),
  vehicleModel: optionalText(60),
  vehicleYear: z
    .number()
    .int()
    .min(1950)
    .max(2100)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  odometerKm: z
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  complaint: optionalText(1000),
  diagnosis: optionalText(1000),
  mechanicName: optionalText(80),
  status: z.enum(SERVICE_STATUSES).default('antrian'),
  discountIdr: z.number().int().min(0).max(100_000_000_000).default(0),
  notes: optionalText(500),
  lines: z.array(serviceLineSchema).min(1, 'Minimal satu baris pekerjaan atau barang').max(60)
});

export const serviceOrderUpdateSchema = z.object({
  status: z.enum(SERVICE_STATUSES).optional(),
  diagnosis: patchText(1000),
  mechanicName: patchText(80),
  notes: patchText(500)
});

/* --- Pembelian, biaya, modal --------------------------------------------- */

export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Nama supplier minimal 2 karakter').max(100),
  phone: optionalText(30),
  address: optionalText(200),
  notes: optionalText(300)
});

export const purchaseItemSchema = z.object({
  itemId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  name: z.string().trim().min(2, 'Nama barang wajib diisi').max(120),
  qty: z.number().int().min(1, 'Jumlah minimal 1').max(1_000_000),
  unitCostIdr: z.number().int().min(0).max(100_000_000_000)
});

export const purchaseSchema = z.object({
  supplierId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  supplierName: optionalText(100),
  invoiceNumber: optionalText(60),
  purchasedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal pembelian wajib diisi'),
  dueDate: dateInput,
  paidIdr: z.number().int().min(0).max(100_000_000_000).default(0),
  notes: optionalText(300),
  items: z.array(purchaseItemSchema).min(1, 'Minimal satu barang').max(60)
});

export const purchasePaymentSchema = z.object({
  amountIdr: z.number().int().min(1, 'Nominal harus lebih dari nol').max(100_000_000_000)
});

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(3, 'Keterangan minimal 3 karakter').max(200),
  amountIdr: z.number().int().min(1, 'Nominal harus lebih dari nol').max(100_000_000_000),
  vendorName: optionalText(100),
  workOrderId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  spentAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib diisi'),
  paidAt: dateInput,
  dueDate: dateInput,
  method: z.enum(PAYMENT_METHODS).optional().nullable(),
  notes: optionalText(300)
});

export const capitalSchema = z.object({
  type: z.enum(CAPITAL_TYPES),
  ownerName: z.string().trim().min(2, 'Nama pemilik wajib diisi').max(100),
  amountIdr: z.number().int().min(1, 'Nominal harus lebih dari nol').max(100_000_000_000),
  method: z.enum(PAYMENT_METHODS).default('transfer'),
  entryAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib diisi'),
  notes: optionalText(300)
});

/* --- Penggajian ---------------------------------------------------------- */

export const divisionSchema = z.object({
  name: z.string().trim().min(2, 'Nama bagian minimal 2 karakter').max(60),
  description: optionalText(200),
  active: z.boolean().default(true)
});

export const employeeSchema = z.object({
  employeeNumber: optionalText(30),
  name: z.string().trim().min(2, 'Nama karyawan minimal 2 karakter').max(100),
  position: optionalText(60),
  divisionId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  phone: optionalText(30),
  address: optionalText(250),
  idNumber: optionalText(30),
  bankAccount: optionalText(60),
  employmentType: z.enum(EMPLOYMENT_TYPES).default('tetap'),
  status: z.enum(EMPLOYEE_STATUSES).default('aktif'),
  joinDate: dateInput,
  contractNumber: optionalText(50),
  contractStart: dateInput,
  contractEnd: dateInput,
  baseSalaryIdr: z.number().int().min(0).max(100_000_000_000).default(0),
  dailyRateIdr: z.number().int().min(0).max(100_000_000_000).default(0),
  notes: optionalText(300),
  active: z.boolean().default(true)
});

export const payrollComponentSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  type: z.enum(PAYROLL_COMPONENT_TYPES),
  amountIdr: z.number().int().min(0).max(100_000_000_000),
  calcNote: optionalText(60)
});

export const payrollSchema = z.object({
  employeeId: z.string().trim().min(1, 'Karyawan wajib dipilih'),
  periodFrom: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Periode mulai wajib diisi'),
  periodTo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Periode selesai wajib diisi'),
  paidAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal bayar wajib diisi'),
  method: z.enum(PAYMENT_METHODS).default('transfer'),
  notes: optionalText(300),
  /** Hanya komponen yang dicentang yang dikirim ke sini. */
  components: z.array(payrollComponentSchema).min(1, 'Pilih minimal satu komponen gaji').max(30)
});

/* --- Konten publik & pengaturan ------------------------------------------ */

export const promoSchema = z.object({
  kind: z.enum(PROMO_KINDS),
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(120),
  description: optionalText(500),
  emoji: z.string().trim().min(1).max(8).default('🎉'),
  normalPriceIdr: z
    .number()
    .int()
    .min(0)
    .max(100_000_000_000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  promoPriceIdr: z
    .number()
    .int()
    .min(0)
    .max(100_000_000_000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? null : v)),
  ctaLabel: optionalText(40),
  startsAt: dateInput,
  endsAt: dateInput,
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true)
});

export const settingsSchema = z.object({
  ppnEnabled: z.boolean().optional(),
  ppnPercent: z.number().min(0, 'Tarif tidak boleh negatif').max(100).optional(),
  pphEnabled: z.boolean().optional(),
  pphPercent: z.number().min(0, 'Tarif tidak boleh negatif').max(100).optional(),
  pphBase: z.enum(PPH_BASES).optional(),
  reportCompanyName: z.string().trim().min(2).max(120).optional(),
  reportNpwp: z.string().trim().max(40).optional(),
  reportAddress: z.string().trim().max(300).optional(),
  reportFooterNote: z.string().trim().max(300).optional(),
  openingCashIdr: z.number().int().min(0).max(1_000_000_000_000).optional()
});
