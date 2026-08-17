'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr, formatDate, type DateLike } from '@/lib/format';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PAYROLL_DEDUCTIONS,
  PAYROLL_EARNINGS,
  type PaymentMethod,
  type PayrollComponentDef
} from '@/lib/karoseri/constants';

type Employee = {
  id: string;
  name: string;
  position: string | null;
  division: string | null;
  employeeNumber: string | null;
  bankAccount: string | null;
  baseSalaryIdr: number;
  active: boolean;
};

type PayrollRow = {
  id: string;
  slipNumber: string;
  periodFrom: DateLike;
  periodTo: DateLike;
  paidAt: DateLike;
  grossIdr: number;
  deductionIdr: number;
  netIdr: number;
  employeeName: string;
  employeePosition: string | null;
};

/** Satu baris komponen: dicentang atau tidak, beserta nominalnya. */
type ComponentState = { enabled: boolean; amount: string; calcNote: string };

function initialState(defs: PayrollComponentDef[]): Record<string, ComponentState> {
  return Object.fromEntries(defs.map((d) => [d.key, { enabled: false, amount: '', calcNote: '' }]));
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function lastDayOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

export function PayrollClient({
  initialEmployees,
  initialPayrolls
}: {
  initialEmployees: Employee[];
  initialPayrolls: PayrollRow[];
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [rows, setRows] = useState(initialPayrolls);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(initialEmployees.length === 0);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    position: '',
    division: '',
    employeeNumber: '',
    bankAccount: '',
    baseSalaryIdr: ''
  });

  const [form, setForm] = useState({
    employeeId: initialEmployees[0]?.id ?? '',
    periodFrom: firstDayOfMonth(),
    periodTo: lastDayOfMonth(),
    paidAt: new Date().toISOString().slice(0, 10),
    method: 'transfer' as PaymentMethod,
    notes: ''
  });

  const [earnings, setEarnings] = useState(() => initialState(PAYROLL_EARNINGS));
  const [deductions, setDeductions] = useState(() => initialState(PAYROLL_DEDUCTIONS));

  const totals = useMemo(() => {
    const sum = (state: Record<string, ComponentState>) =>
      Object.values(state).reduce((acc, c) => (c.enabled ? acc + (Number(c.amount) || 0) : acc), 0);
    const gross = sum(earnings);
    const deduction = sum(deductions);
    return { gross, deduction, net: gross - deduction };
  }, [earnings, deductions]);

  /** Mencentang gaji pokok otomatis mengisi nominal dari data karyawan. */
  function toggleEarning(key: string, enabled: boolean) {
    setEarnings((prev) => {
      const next = { ...prev, [key]: { ...prev[key], enabled } };
      if (key === 'gaji_pokok' && enabled && !prev[key].amount) {
        const employee = employees.find((e) => e.id === form.employeeId);
        if (employee?.baseSalaryIdr) next[key] = { ...next[key], amount: String(employee.baseSalaryIdr) };
      }
      return next;
    });
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/panel/karyawan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmployee.name,
          position: newEmployee.position || null,
          division: newEmployee.division || null,
          employeeNumber: newEmployee.employeeNumber || null,
          bankAccount: newEmployee.bankAccount || null,
          baseSalaryIdr: Number(newEmployee.baseSalaryIdr || 0),
          active: true
        })
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Gagal menambah karyawan.');

      const created: Employee = {
        id: data.id,
        name: newEmployee.name,
        position: newEmployee.position || null,
        division: newEmployee.division || null,
        employeeNumber: newEmployee.employeeNumber || null,
        bankAccount: newEmployee.bankAccount || null,
        baseSalaryIdr: Number(newEmployee.baseSalaryIdr || 0),
        active: true
      };
      setEmployees((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, employeeId: created.id }));
      setNewEmployee({ name: '', position: '', division: '', employeeNumber: '', bankAccount: '', baseSalaryIdr: '' });
      setShowEmployeeForm(false);
      setNotice(`Karyawan ${created.name} ditambahkan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah karyawan.');
    }
  }

  async function submitPayroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const components = [
      ...PAYROLL_EARNINGS.filter((d) => earnings[d.key].enabled).map((d) => ({
        key: d.key,
        label: d.label,
        type: 'penghasilan' as const,
        amountIdr: Number(earnings[d.key].amount || 0),
        calcNote: earnings[d.key].calcNote || null
      })),
      ...PAYROLL_DEDUCTIONS.filter((d) => deductions[d.key].enabled).map((d) => ({
        key: d.key,
        label: d.label,
        type: 'potongan' as const,
        amountIdr: Number(deductions[d.key].amount || 0),
        calcNote: deductions[d.key].calcNote || null
      }))
    ];

    if (components.length === 0) {
      setError('Centang minimal satu komponen gaji.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/panel/penggajian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, notes: form.notes || null, components })
      });
      const data = (await res.json()) as { id?: string; slipNumber?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Gagal menyimpan slip gaji.');

      const employee = employees.find((emp) => emp.id === form.employeeId);
      setRows((prev) => [
        {
          id: data.id!,
          slipNumber: data.slipNumber!,
          periodFrom: form.periodFrom,
          periodTo: form.periodTo,
          paidAt: form.paidAt,
          grossIdr: totals.gross,
          deductionIdr: totals.deduction,
          netIdr: totals.net,
          employeeName: employee?.name ?? '-',
          employeePosition: employee?.position ?? null
        },
        ...prev
      ]);
      setEarnings(initialState(PAYROLL_EARNINGS));
      setDeductions(initialState(PAYROLL_DEDUCTIONS));
      setNotice(`Slip gaji ${data.slipNumber} tersimpan dan otomatis tercatat sebagai biaya gaji.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan slip gaji.');
    } finally {
      setSaving(false);
    }
  }

  async function removePayroll(id: string) {
    if (!confirm('Hapus slip gaji ini? Biaya gaji yang tercatat ikut dihapus.')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/penggajian/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus slip gaji.');
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus slip gaji.');
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 dark:text-white">Karyawan</h2>
          <button type="button" onClick={() => setShowEmployeeForm((v) => !v)} className="text-sm font-semibold text-quantum-600 hover:underline">
            {showEmployeeForm ? 'Tutup' : '+ Tambah karyawan'}
          </button>
        </div>

        {showEmployeeForm && (
          <form onSubmit={addEmployee} className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:grid-cols-3 dark:border-slate-700">
            <input className="input" required placeholder="Nama karyawan *" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
            <input className="input" placeholder="Jabatan" value={newEmployee.position} onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })} />
            <input className="input" placeholder="Bagian" value={newEmployee.division} onChange={(e) => setNewEmployee({ ...newEmployee, division: e.target.value })} />
            <input className="input" placeholder="No. induk karyawan" value={newEmployee.employeeNumber} onChange={(e) => setNewEmployee({ ...newEmployee, employeeNumber: e.target.value })} />
            <input className="input" placeholder="No. rekening" value={newEmployee.bankAccount} onChange={(e) => setNewEmployee({ ...newEmployee, bankAccount: e.target.value })} />
            <input type="number" min={0} step={1000} className="input" placeholder="Gaji pokok (Rp)" value={newEmployee.baseSalaryIdr} onChange={(e) => setNewEmployee({ ...newEmployee, baseSalaryIdr: e.target.value })} />
            <button type="submit" className="btn-primary sm:col-span-3">
              Simpan karyawan
            </button>
          </form>
        )}

        <p className="text-sm text-slate-500 dark:text-slate-400">{employees.length} karyawan terdaftar.</p>
      </section>

      <form onSubmit={submitPayroll} className="card space-y-5">
        <h2 className="font-bold text-slate-900 dark:text-white">Buat slip gaji</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="label text-xs">Karyawan</label>
            <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
              {employees.length === 0 && <option value="">— belum ada karyawan —</option>}
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.position ? ` — ${emp.position}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Periode mulai</label>
            <input type="date" className="input" required value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })} />
          </div>
          <div>
            <label className="label text-xs">Periode selesai</label>
            <input type="date" className="input" required value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })} />
          </div>
          <div>
            <label className="label text-xs">Tanggal bayar</label>
            <input type="date" className="input" required value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ComponentGroup
            title="Penghasilan"
            tone="emerald"
            defs={PAYROLL_EARNINGS}
            state={earnings}
            onToggle={toggleEarning}
            onChange={(key, patch) => setEarnings((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))}
            total={totals.gross}
          />
          <ComponentGroup
            title="Potongan"
            tone="red"
            defs={PAYROLL_DEDUCTIONS}
            state={deductions}
            onToggle={(key, enabled) => setDeductions((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }))}
            onChange={(key, patch) => setDeductions((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))}
            total={totals.deduction}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label text-xs">Metode pembayaran</label>
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label text-xs">Catatan</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsional" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-900 px-5 py-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-gold-400">Gaji bersih</p>
            <p className="text-xs text-slate-400">Total penghasilan − total potongan</p>
          </div>
          <p className="text-2xl font-black tabular-nums">{formatIdr(totals.net)}</p>
        </div>

        <button type="submit" disabled={saving || employees.length === 0} className="btn-primary">
          {saving ? 'Menyimpan…' : 'Simpan slip gaji'}
        </button>
      </form>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Riwayat penggajian</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>No. Slip</th>
              <th>Karyawan</th>
              <th>Periode</th>
              <th className="text-right">Penghasilan</th>
              <th className="text-right">Potongan</th>
              <th className="text-right">Gaji bersih</th>
              <th>Cetak</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-mono text-xs">{row.slipNumber}</td>
                <td>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{row.employeeName}</div>
                  {row.employeePosition && <div className="text-xs text-slate-400">{row.employeePosition}</div>}
                </td>
                <td className="text-xs">
                  {formatDate(row.periodFrom)} – {formatDate(row.periodTo)}
                </td>
                <td className="text-right tabular-nums">{formatIdr(row.grossIdr)}</td>
                <td className="text-right tabular-nums">{formatIdr(row.deductionIdr)}</td>
                <td className="text-right font-bold tabular-nums">{formatIdr(row.netIdr)}</td>
                <td className="whitespace-nowrap">
                  <a href={`/api/panel/dokumen/slip-gaji/${row.id}?format=pdf`} download className="text-xs font-semibold text-quantum-600 hover:underline">
                    PDF
                  </a>
                  <a href={`/api/panel/dokumen/slip-gaji/${row.id}?format=doc`} download className="ml-3 text-xs font-semibold text-quantum-600 hover:underline">
                    Word
                  </a>
                </td>
                <td className="text-right">
                  <button onClick={() => removePayroll(row.id)} className="text-xs text-red-500 hover:underline">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Belum ada slip gaji dibuat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ComponentGroup({
  title,
  tone,
  defs,
  state,
  onToggle,
  onChange,
  total
}: {
  title: string;
  tone: 'emerald' | 'red';
  defs: PayrollComponentDef[];
  state: Record<string, ComponentState>;
  onToggle: (key: string, enabled: boolean) => void;
  onChange: (key: string, patch: Partial<ComponentState>) => void;
  total: number;
}) {
  const headerTone = tone === 'emerald' ? 'bg-quantum-600' : 'bg-red-600';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className={`px-4 py-2 text-sm font-bold text-white ${headerTone}`}>{title}</div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {defs.map((def) => {
          const current = state[def.key];
          return (
            <div key={def.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={current.enabled}
                  onChange={(e) => onToggle(def.key, e.target.checked)}
                />
                <span className={current.enabled ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                  {def.label}
                </span>
              </label>

              {def.calcHint && current.enabled && (
                <input
                  className="input input-inline h-9 w-32 py-1 text-xs"
                  placeholder={def.calcHint}
                  value={current.calcNote}
                  onChange={(e) => onChange(def.key, { calcNote: e.target.value })}
                />
              )}

              <input
                type="number"
                min={0}
                step={1000}
                disabled={!current.enabled}
                className="input input-inline h-9 w-36 py-1 text-right text-sm"
                placeholder="0"
                value={current.amount}
                onChange={(e) => onChange(def.key, { amount: e.target.value })}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-slate-800">
        <span>TOTAL {title.toUpperCase()}</span>
        <span className="tabular-nums">{formatIdr(total)}</span>
      </div>
    </div>
  );
}
