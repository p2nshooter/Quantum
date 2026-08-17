'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatIdr, formatDate, toDateInput, daysUntil, type DateLike } from '@/lib/format';
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABEL,
  MONTHLY_SALARY_TYPES,
  type EmployeeStatus,
  type EmploymentType
} from '@/lib/karoseri/constants';

export type Division = { id: string; name: string; description: string | null; active: boolean };

export type Employee = {
  id: string;
  employeeNumber: string | null;
  name: string;
  position: string | null;
  division: string | null;
  divisionId: string | null;
  divisionName?: string | null;
  phone: string | null;
  address: string | null;
  idNumber: string | null;
  bankAccount: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  joinDate: DateLike;
  contractNumber: string | null;
  contractStart: DateLike;
  contractEnd: DateLike;
  baseSalaryIdr: number;
  dailyRateIdr: number;
  notes: string | null;
  active: boolean;
};

const EMPTY = {
  employeeNumber: '',
  name: '',
  position: '',
  divisionId: '',
  phone: '',
  address: '',
  idNumber: '',
  bankAccount: '',
  employmentType: 'tetap' as EmploymentType,
  status: 'aktif' as EmployeeStatus,
  joinDate: '',
  contractNumber: '',
  contractStart: '',
  contractEnd: '',
  baseSalaryIdr: '',
  dailyRateIdr: '',
  notes: ''
};

export function EmployeesClient({
  initialEmployees,
  initialDivisions,
  canEdit
}: {
  initialEmployees: Employee[];
  initialDivisions: Division[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [divisions, setDivisions] = useState(initialDivisions);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [divisionName, setDivisionName] = useState('');
  const [filterDivision, setFilterDivision] = useState('');

  const visible = useMemo(
    () => (filterDivision ? employees.filter((e) => e.divisionId === filterDivision) : employees),
    [employees, filterDivision]
  );

  const summary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'aktif');
    // Beban gaji bulanan hanya dari karyawan tetap/kontrak; harian dan borongan
    // dibayar per pekerjaan sehingga tidak bisa dijumlahkan sebagai beban tetap.
    const monthly = active
      .filter((e) => MONTHLY_SALARY_TYPES.includes(e.employmentType))
      .reduce((sum, e) => sum + e.baseSalaryIdr, 0);
    const expiring = active.filter((e) => {
      const days = daysUntil(e.contractEnd);
      return days !== null && days <= 30;
    });
    return { total: employees.length, active: active.length, monthly, expiring };
  }, [employees]);

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm({
      employeeNumber: employee.employeeNumber ?? '',
      name: employee.name,
      position: employee.position ?? '',
      divisionId: employee.divisionId ?? '',
      phone: employee.phone ?? '',
      address: employee.address ?? '',
      idNumber: employee.idNumber ?? '',
      bankAccount: employee.bankAccount ?? '',
      employmentType: employee.employmentType,
      status: employee.status,
      joinDate: toDateInput(employee.joinDate),
      contractNumber: employee.contractNumber ?? '',
      contractStart: toDateInput(employee.contractStart),
      contractEnd: toDateInput(employee.contractEnd),
      baseSalaryIdr: String(employee.baseSalaryIdr || ''),
      dailyRateIdr: String(employee.dailyRateIdr || ''),
      notes: employee.notes ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);

    const payload = {
      employeeNumber: form.employeeNumber || null,
      name: form.name,
      position: form.position || null,
      divisionId: form.divisionId || null,
      phone: form.phone || null,
      address: form.address || null,
      idNumber: form.idNumber || null,
      bankAccount: form.bankAccount || null,
      employmentType: form.employmentType,
      status: form.status,
      joinDate: form.joinDate || null,
      contractNumber: form.contractNumber || null,
      contractStart: form.contractStart || null,
      contractEnd: form.contractEnd || null,
      baseSalaryIdr: Number(form.baseSalaryIdr || 0),
      dailyRateIdr: Number(form.dailyRateIdr || 0),
      notes: form.notes || null,
      active: form.status === 'aktif'
    };

    try {
      const res = await fetch(editingId ? `/api/panel/karyawan/${editingId}` : '/api/panel/karyawan', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data karyawan.');

      const divName = divisions.find((d) => d.id === payload.divisionId)?.name ?? null;
      const merged = { ...payload, division: divName, divisionName: divName } as unknown as Employee;

      if (editingId) {
        setEmployees((prev) => prev.map((emp) => (emp.id === editingId ? { ...merged, id: editingId } : emp)));
        setNotice(`Data ${payload.name} diperbarui.`);
      } else if (data.id) {
        setEmployees((prev) => [...prev, { ...merged, id: data.id! }].sort((a, b) => a.name.localeCompare(b.name)));
        setNotice(`Karyawan ${payload.name} ditambahkan.`);
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data karyawan.');
    } finally {
      setSaving(false);
    }
  }

  async function removeEmployee(id: string, name: string) {
    if (!confirm(`Hapus karyawan ${name}?`)) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/panel/karyawan/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string; deactivated?: boolean; message?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus karyawan.');

      if (data.deactivated) {
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === id ? { ...emp, status: 'nonaktif' as EmployeeStatus, active: false } : emp))
        );
        setNotice(data.message ?? 'Karyawan dinonaktifkan.');
      } else {
        setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus karyawan.');
    }
  }

  async function addDivision(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/panel/bagian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: divisionName, active: true })
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Gagal menambah bagian.');
      setDivisions((prev) => [...prev, { id: data.id!, name: divisionName, description: null, active: true }]);
      setDivisionName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah bagian.');
    }
  }

  async function importDivisionPresets() {
    setError(null);
    const res = await fetch('/api/panel/bagian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: true })
    });
    if (res.ok) router.refresh();
    else setError('Gagal memuat bagian bawaan.');
  }

  async function removeDivision(id: string, name: string) {
    if (!confirm(`Hapus bagian ${name}?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/bagian/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus bagian.');
      setDivisions((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus bagian.');
    }
  }

  const isMonthly = MONTHLY_SALARY_TYPES.includes(form.employmentType);

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total karyawan" value={String(summary.total)} />
        <SummaryCard label="Aktif" value={String(summary.active)} />
        <SummaryCard label="Beban gaji bulanan" value={formatIdr(summary.monthly)} hint="Tetap & kontrak" />
        <SummaryCard
          label="Kontrak akan habis"
          value={String(summary.expiring.length)}
          hint="Dalam 30 hari ke depan"
          warn={summary.expiring.length > 0}
        />
      </div>

      {summary.expiring.length > 0 && (
        <div className="card border-gold-400 bg-gold-50 dark:bg-gold-900/10">
          <h2 className="font-bold text-slate-900 dark:text-white">Kontrak segera berakhir</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {summary.expiring.map((emp) => {
              const days = daysUntil(emp.contractEnd)!;
              return (
                <li key={emp.id}>
                  <strong>{emp.name}</strong> — {emp.position ?? 'tanpa jabatan'} · berakhir {formatDate(emp.contractEnd)}{' '}
                  {days < 0 ? `(lewat ${Math.abs(days)} hari)` : `(${days} hari lagi)`}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canEdit && (
        <section className="card space-y-3">
          <h2 className="font-bold text-slate-900 dark:text-white">Bagian / Departemen</h2>
          <div className="flex flex-wrap gap-2">
            {divisions.map((division) => (
              <span
                key={division.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-2 text-sm dark:bg-slate-800"
              >
                {division.name}
                <button
                  onClick={() => removeDivision(division.id, division.name)}
                  className="text-red-500 hover:text-red-600"
                  aria-label={`Hapus bagian ${division.name}`}
                >
                  ×
                </button>
              </span>
            ))}
            {divisions.length === 0 && (
              <button onClick={importDivisionPresets} className="btn-secondary">
                Muat bagian bawaan bengkel
              </button>
            )}
          </div>

          <form onSubmit={addDivision} className="flex flex-wrap gap-2">
            <input
              className="input sm:max-w-xs"
              placeholder="Nama bagian baru"
              required
              value={divisionName}
              onChange={(e) => setDivisionName(e.target.value)}
            />
            <button type="submit" className="btn-secondary">
              + Tambah bagian
            </button>
          </form>
        </section>
      )}

      {canEdit && (
        <form onSubmit={saveEmployee} className="card space-y-4">
          <h2 className="font-bold text-slate-900 dark:text-white">
            {editingId ? 'Ubah data karyawan' : 'Tambah karyawan'}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input className="input" required placeholder="Nama lengkap *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Jabatan (mis. Montir)" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            <select className="input" value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })} aria-label="Bagian">
              <option value="">— pilih bagian —</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input className="input" placeholder="No. induk karyawan" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
            <input className="input" placeholder="No. HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="NIK / No. KTP" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            <input className="input lg:col-span-2" placeholder="Alamat" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-3 text-sm font-bold text-quantum-600">Kontrak kerja &amp; upah</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label text-xs">Jenis kepegawaian</label>
                <select className="input" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EMPLOYMENT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeStatus })}>
                  {EMPLOYEE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {EMPLOYEE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Tanggal masuk</label>
                <input type="date" className="input" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">No. kontrak</label>
                <input className="input" value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Kontrak mulai</label>
                <input type="date" className="input" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">Kontrak berakhir</label>
                <input type="date" className="input" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{isMonthly ? 'Gaji pokok / bulan' : 'Gaji pokok (opsional)'}</label>
                <input type="number" min={0} step={1000} className="input" value={form.baseSalaryIdr} onChange={(e) => setForm({ ...form, baseSalaryIdr: e.target.value })} />
              </div>
              <div>
                <label className="label text-xs">{isMonthly ? 'Upah harian (opsional)' : 'Upah harian / borongan'}</label>
                <input type="number" min={0} step={1000} className="input" value={form.dailyRateIdr} onChange={(e) => setForm({ ...form, dailyRateIdr: e.target.value })} />
              </div>
              <input className="input lg:col-span-2" placeholder="No. rekening" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
              <input className="input lg:col-span-2" placeholder="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : '+ Tambah karyawan'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary">
                Batal
              </button>
            )}
          </div>
        </form>
      )}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 dark:text-white">Daftar karyawan ({visible.length})</h2>
          <select
            className="input input-inline h-9 py-1 text-xs"
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            aria-label="Saring per bagian"
          >
            <option value="">Semua bagian</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Bagian</th>
                <th>Kepegawaian</th>
                <th>Kontrak</th>
                <th className="text-right">Gaji / upah</th>
                <th>Status</th>
                <th>Kontrak kerja</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {visible.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</div>
                    <div className="text-xs text-slate-400">
                      {emp.position ?? '—'}
                      {emp.employeeNumber ? ` · ${emp.employeeNumber}` : ''}
                    </div>
                  </td>
                  <td>{emp.divisionName || emp.division || '—'}</td>
                  <td>{EMPLOYMENT_TYPE_LABEL[emp.employmentType]}</td>
                  <td className="text-xs">
                    {emp.contractEnd ? (
                      <>
                        <div>s/d {formatDate(emp.contractEnd)}</div>
                        {emp.contractNumber && <div className="text-slate-400">{emp.contractNumber}</div>}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums">
                    {MONTHLY_SALARY_TYPES.includes(emp.employmentType)
                      ? `${formatIdr(emp.baseSalaryIdr)} / bln`
                      : `${formatIdr(emp.dailyRateIdr)} / hari`}
                  </td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        emp.status === 'aktif'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : emp.status === 'cuti'
                            ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {EMPLOYEE_STATUS_LABEL[emp.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <a href={`/api/panel/dokumen/kontrak-kerja/${emp.id}?format=pdf`} download className="text-xs font-semibold text-quantum-600 hover:underline">
                      PDF
                    </a>
                    <a href={`/api/panel/dokumen/kontrak-kerja/${emp.id}?format=doc`} download className="ml-3 text-xs font-semibold text-quantum-600 hover:underline">
                      Word
                    </a>
                  </td>
                  {canEdit && (
                    <td className="whitespace-nowrap text-right">
                      <button onClick={() => startEdit(emp)} className="text-xs font-semibold text-quantum-600 hover:underline">
                        Ubah
                      </button>
                      <button onClick={() => removeEmployee(emp.id, emp.name)} className="ml-3 text-xs text-red-500 hover:underline">
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-slate-400">
                    Belum ada karyawan terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-xl font-black tabular-nums ${warn ? 'text-gold-600 dark:text-gold-400' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
