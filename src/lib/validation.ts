import { z } from 'zod';
import {
  LEAD_STATUSES,
  PAYMENT_METHODS,
  PRIORITIES,
  STAGE_STATUSES,
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
