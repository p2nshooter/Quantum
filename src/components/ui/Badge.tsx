import {
  PRIORITY_LABEL,
  STAGE_STATUS_LABEL,
  WORK_ORDER_STATUS_LABEL,
  LEAD_STATUS_LABEL,
  type LeadStatus,
  type Priority,
  type StageStatus,
  type WorkOrderStatus
} from '@/lib/karoseri/constants';

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap';

const NEUTRAL = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
const BLUE = 'bg-quantum-100 text-quantum-700 dark:bg-quantum-950 dark:text-quantum-300';
const AMBER = 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300';
const GREEN = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
const RED = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

const WORK_ORDER_TONE: Record<WorkOrderStatus, string> = {
  draft: NEUTRAL,
  antrian: AMBER,
  produksi: BLUE,
  qc: AMBER,
  selesai: GREEN,
  diserahkan: GREEN,
  batal: RED
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return <span className={`${BASE} ${WORK_ORDER_TONE[status]}`}>{WORK_ORDER_STATUS_LABEL[status]}</span>;
}

const STAGE_TONE: Record<StageStatus, string> = {
  pending: NEUTRAL,
  in_progress: BLUE,
  done: GREEN,
  blocked: RED
};

export function StageBadge({ status }: { status: StageStatus }) {
  return <span className={`${BASE} ${STAGE_TONE[status]}`}>{STAGE_STATUS_LABEL[status]}</span>;
}

const PRIORITY_TONE: Record<Priority, string> = {
  normal: NEUTRAL,
  tinggi: AMBER,
  urgent: RED
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'normal') return null;
  return <span className={`${BASE} ${PRIORITY_TONE[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

const LEAD_TONE: Record<LeadStatus, string> = {
  baru: AMBER,
  diproses: BLUE,
  penawaran: BLUE,
  deal: GREEN,
  batal: NEUTRAL
};

export function LeadBadge({ status }: { status: LeadStatus }) {
  return <span className={`${BASE} ${LEAD_TONE[status]}`}>{LEAD_STATUS_LABEL[status]}</span>;
}
